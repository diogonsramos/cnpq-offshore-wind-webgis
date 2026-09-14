#!/usr/bin/env python3
"""
==============================================================================
CNPq WebGIS Offshore - HPC GeoParquet Generator v3 (Reescrito)
==============================================================================
Este script realiza o processamento dos arquivos NetCDF de alta resolução (WRF e MPAS)
e gera arquivos GeoParquet otimizados para o WebGIS/Dashboard.

Novidades v3:
 1. Filtragem Antecipada (Offshore): Descarta pixels onshore (NaNs) na primeira etapa (~140k -> ~30k).
 2. Rosa dos Ventos Vetorizada: Cálculo de 16 setores a partir da série U e V horária (time_series_uvws.nc).
 3. Ajuste Weibull Paralelizado: Maximum Likelihood nativo via scipy, rodando em multiprocessing pool.
 4. Percentis: Consome os percentis p5, p50, p95, p99 gerados pelo novo run_stats_cdo.sh.
==============================================================================
"""

import os
import sys
import glob
import logging
import argparse
import numpy as np
import pandas as pd
import xarray as xr
import geopandas as gpd
import pyarrow as pa
import pyarrow.parquet as pq
from shapely.geometry import Point
from tqdm import tqdm
import multiprocessing
from scipy.stats import weibull_min
import warnings

warnings.filterwarnings('ignore')

# ==============================================================================
# CONFIGURAÇÕES E CONSTANTES PADRÃO
# ==============================================================================
SHP_DIR = "/scratch/projetos/cnpq-offshore/dados/resultados/2025_report/scripts/shp/shp_webgis"
BATHY_GEOJSON = os.path.join(SHP_DIR, "bathy_0_20_50_75_100_estadual.geojson")
ZEE_GEOJSON = os.path.join(SHP_DIR, "mn_zee_estadual.geojson")

BASE_NC_DIR = "/scratch/projetos/cnpq-offshore/dados/resultados/2025_report/webgis_final/nc"
OUT_GEOPARQUET_DIR = "/scratch/projetos/cnpq-offshore/dados/resultados/2025_report/webgis_final/geoparquet"

HEIGHTS = [10, 50, 100, 150, 200]
SEASONS = ["ANNUAL", "DJF", "MAM", "JJA", "SON"]

ALL_MODELS = ["wrf", "mpas"]
ALL_EXPS = ["era5", "hist", "ssp245", "ssp585"]
ALL_VARS = ["ws", "wpd", "weibull", "wind_rose"]

CARDINAL_DIRECTIONS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

def find_nc_file(nc_folder: str, var_prefix: str, h, suffix: str) -> str:
    """Busca o arquivo NC tentando as variações de padrão."""
    if h is None:
        candidates = [f"{var_prefix}_{suffix}.nc"]
    else:
        candidates = [
            f"{var_prefix}_{h}_{suffix}.nc",
            f"{var_prefix}{h}_{suffix}.nc",
            f"{var_prefix}_{h}m_{suffix}.nc",
            f"{var_prefix}_{h}_{suffix}.nc.nc"
        ]
    for c in candidates:
        p = os.path.join(nc_folder, c)
        if os.path.exists(p):
            return p
    return ""

def get_main_data_var(ds: xr.Dataset) -> str:
    ignore = {"spatial_ref", "crs", "lat_bnds", "lon_bnds", "time_bnds", "height", "grid_mapping"}
    candidates = [v for v in ds.data_vars if v not in ignore and not v.endswith("_bnds")]
    if not candidates:
        candidates = list(ds.data_vars)
    return max(candidates, key=lambda v: ds[v].size)

# ==============================================================================
# HILBERT CURVE
# ==============================================================================
def hilbert_index_2d(x: int, y: int, order: int = 16) -> int:
    d = 0
    s = 1 << (order - 1)
    while s > 0:
        rx = 1 if (x & s) > 0 else 0
        ry = 1 if (y & s) > 0 else 0
        d += s * s * ((3 * rx) ^ ry)
        if ry == 0:
            if rx == 1:
                x = (1 << order) - 1 - x
                y = (1 << order) - 1 - y
            x, y = y, x
        s >>= 1
    return d

def compute_spatial_sorting_key(lats: np.ndarray, lons: np.ndarray, order: int = 16) -> np.ndarray:
    min_lat, max_lat = -35.0, 10.0
    min_lon, max_lon = -55.0, -25.0
    
    norm_x = np.clip((lons - min_lon) / (max_lon - min_lon), 0, 1)
    norm_y = np.clip((lats - min_lat) / (max_lat - min_lat), 0, 1)
    
    max_val = (1 << order) - 1
    ix = (norm_x * max_val).astype(np.int32)
    iy = (norm_y * max_val).astype(np.int32)
    
    keys = np.array([hilbert_index_2d(x, y, order) for x, y in zip(ix, iy)], dtype=np.int64)
    return keys

# ==============================================================================
# SPATIAL JOIN E FILTRAGEM OFFSHORE
# ==============================================================================
def load_and_filter_spatial_metadata(lats: np.ndarray, lons: np.ndarray, sample_nc: str) -> pd.DataFrame:
    """Filtra os NaNs (onshore) prematuramente, reduzindo a carga, e faz o join."""
    with xr.open_dataset(sample_nc) as ds:
        var_name = get_main_data_var(ds)
        # O arquivo de amostra é uma matriz estática (avg), extraimos a máscara
        valid_mask = ~np.isnan(ds[var_name].squeeze().values.flatten())
    
    grid_df = pd.DataFrame({
        "pixel_id": np.arange(len(lats), dtype=np.int32),
        "lat": lats.astype(np.float32),
        "lon": lons.astype(np.float32),
        "valid": valid_mask
    })
    
    # Descarta pixels onshore
    grid_df = grid_df[grid_df["valid"]].drop(columns=["valid"]).reset_index(drop=True)
    logging.info(f"Filtro Offshore: Manteve {len(grid_df)} pixels de um total de {len(lats)}.")

    geometry = [Point(xy) for xy in zip(grid_df["lon"], grid_df["lat"])]
    pixels_gdf = gpd.GeoDataFrame(grid_df, geometry=geometry, crs="EPSG:4326")

    bathy_gdf = gpd.read_file(BATHY_GEOJSON).to_crs("EPSG:4326")
    zee_gdf = gpd.read_file(ZEE_GEOJSON).to_crs("EPSG:4326")

    joined_bathy = gpd.sjoin(pixels_gdf, bathy_gdf[["geometry", "estado", "profundidade"]], how="left", predicate="intersects")
    joined_bathy = joined_bathy.drop_duplicates(subset=["pixel_id"]).drop(columns=["index_right"]).rename(columns={
        "estado": "state_bathy",
        "profundidade": "bathy_zone"
    })

    joined_zee = gpd.sjoin(joined_bathy, zee_gdf[["geometry", "estado"]], how="left", predicate="intersects")
    joined_zee = joined_zee.drop_duplicates(subset=["pixel_id"]).drop(columns=["index_right"]).rename(columns={
        "estado": "state_zee"
    })

    joined_zee["state"] = joined_zee["state_zee"].fillna(joined_zee["state_bathy"]).fillna("")
    joined_zee["bathy_zone"] = joined_zee["bathy_zone"].fillna("out_of_range")
    joined_zee["distance_nm"] = np.float32(0.0)

    hilbert_keys = compute_spatial_sorting_key(joined_zee["lat"].values, joined_zee["lon"].values)
    joined_zee["hilbert_key"] = hilbert_keys
    joined_zee = joined_zee.sort_values("hilbert_key").reset_index(drop=True)

    return joined_zee[["pixel_id", "lat", "lon", "state", "bathy_zone", "distance_nm", "hilbert_key"]]

# ==============================================================================
# WEIBULL PARALELO
# ==============================================================================
def fit_weibull_pixel(ws_series):
    data = ws_series[~np.isnan(ws_series) & (ws_series > 0)]
    if len(data) < 10:
        return 0.0, 0.0
    try:
        # floc=0 forca a distribuicao 2-par, retorna (shape, loc, scale)
        shape, loc, scale = weibull_min.fit(data, floc=0)
        return float(scale), float(shape)
    except:
        return 0.0, 0.0

# ==============================================================================
# WEIBULL & ROSA DOS VENTOS VETORIZADA A PARTIR DA SÉRIE TEMPORAL
# ==============================================================================
def process_wind_rose_and_weibull(df: pd.DataFrame, nc_folder: str, target_vars: list):
    time_series_file = os.path.join(nc_folder, "time_series_uvws.nc")
    
    if not os.path.exists(time_series_file):
        logging.warning(f"Série temporal não encontrada, ignorando Rosa/Weibull: {time_series_file}")
        return df

    pixel_ids = df["pixel_id"].values
    n_pixels = len(pixel_ids)

    with xr.open_dataset(time_series_file) as ds:
        for h in HEIGHTS:
            u_var = f"U_{h}_OUT" if f"U_{h}_OUT" in ds.data_vars else f"U{h}" if f"U{h}" in ds.data_vars else None
            v_var = f"V_{h}_OUT" if f"V_{h}_OUT" in ds.data_vars else f"V{h}" if f"V{h}" in ds.data_vars else None
            ws_var = f"WS_{h}_OUT" if f"WS_{h}_OUT" in ds.data_vars else f"WS{h}" if f"WS{h}" in ds.data_vars else None

            if not (u_var and v_var and ws_var):
                logging.warning(f"Variáveis U, V ou WS ausentes para {h}m em {time_series_file}")
                continue
                
            logging.info(f"Processando Rosa e Weibull para {h}m...")

            # Ler apenas os pixels offshore desejados, achatando a dimensão espacial
            u_da = ds[u_var].squeeze()
            v_da = ds[v_var].squeeze()
            ws_da = ds[ws_var].squeeze()

            # Achatar o mapa e extrair índices: resultando em shape (time, n_pixels)
            # Como a grade pode ser 2D (time, lat, lon) ou 1D (time, cell), reshapar p/ 2D (time, -1)
            u_vals = u_da.values.reshape(u_da.shape[0], -1)[:, pixel_ids]
            v_vals = v_da.values.reshape(v_da.shape[0], -1)[:, pixel_ids]
            ws_vals = ws_da.values.reshape(ws_da.shape[0], -1)[:, pixel_ids]

            # -----------------------------------------------------
            # ROSA DOS VENTOS (16 SETORES)
            # -----------------------------------------------------
            if "wind_rose" in target_vars:
                # Modulação Meteorológica (graus a partir do Norte, horário)
                theta = np.mod(270.0 - (180.0 / np.pi) * np.arctan2(v_vals, u_vals), 360.0)
                sectors = np.floor((theta + 11.25) / 22.5).astype(int) % 16

                valid_ws = ~np.isnan(ws_vals)
                total_valid_per_pixel = valid_ws.sum(axis=0)
                
                sector_metrics = {s_name: {"freq": np.zeros(n_pixels, dtype=np.float32), 
                                           "mean_ws": np.zeros(n_pixels, dtype=np.float32)} 
                                  for s_name in CARDINAL_DIRECTIONS_16}

                for s_idx, s_name in enumerate(CARDINAL_DIRECTIONS_16):
                    mask_s = (sectors == s_idx) & valid_ws
                    count_s = mask_s.sum(axis=0)
                    
                    freq_s = np.where(total_valid_per_pixel > 0, count_s / total_valid_per_pixel, 0.0)
                    sum_ws_s = np.where(mask_s, ws_vals, 0.0).sum(axis=0)
                    mean_ws_s = np.where(count_s > 0, sum_ws_s / np.maximum(count_s, 1), 0.0)
                    
                    sector_metrics[s_name]["freq"] = freq_s
                    sector_metrics[s_name]["mean_ws"] = mean_ws_s

                wind_rose_list = [
                    {s_name: {"freq": float(sector_metrics[s_name]["freq"][p]), 
                              "mean_ws": float(sector_metrics[s_name]["mean_ws"][p])} 
                     for s_name in CARDINAL_DIRECTIONS_16}
                    for p in range(n_pixels)
                ]
                df[f"wind_rose_{h}m"] = wind_rose_list

            # -----------------------------------------------------
            # WEIBULL PARAL সাংস্কৃতিক
            # -----------------------------------------------------
            if "weibull" in target_vars:
                ws_list = [ws_vals[:, p] for p in range(n_pixels)]
                with multiprocessing.Pool(processes=min(16, multiprocessing.cpu_count())) as pool:
                    results = pool.map(fit_weibull_pixel, ws_list)
                
                df[f"weibull_{h}m"] = [{"c": c, "k": k} for c, k in results]

    return df

# ==============================================================================
# CONSTRUÇÃO DA PARTIÇÃO GEOPARQUET
# ==============================================================================
def build_partition(model: str, exp: str, season: str, spatial_df: pd.DataFrame, target_vars: list, dry_run: bool = False):
    season_lc = season.lower()
    nc_folder = os.path.join(BASE_NC_DIR, model, exp, "anual" if season == "ANNUAL" else f"sazonal/{season_lc}")
    out_dir = os.path.join(OUT_GEOPARQUET_DIR, model, exp)
    out_path = os.path.join(out_dir, f"season={season_lc}.parquet")

    if dry_run:
        logging.info(f"[DRY-RUN] Processando {model}/{exp} | Estação: {season} -> {out_path}")
        return

    df = spatial_df.copy()
    df["season"] = season

    # Mapeamento estendido com percentis
    stats_map = [
        ("mean", "avg"),
        ("std", "std"),
        ("min", "min"),
        ("max", "max"),
        ("p5", "p5"),
        ("p50", "p50"),
        ("p95", "p95"),
        ("p99", "p99")
    ]

    # 1. CDO STATS (Todas as variáveis)
    all_var_prefixes = [
        ("ws", "WS", HEIGHTS),
        ("wpd", "WPD", HEIGHTS),
        ("p", "P", HEIGHTS),
        ("t", "T", [2, 50, 100, 150, 200]),
        ("rho", "RHO", HEIGHTS),
        ("theta", "THETA", HEIGHTS),
        ("g_10_200", "G_10_200", [None]),
        ("n2_10_200", "N2_10_200", [None]),
        ("alpha_10_100", "ALPHA_10_100", [None]),
        ("alpha_10_200", "ALPHA_10_200", [None]),
    ]
    
    for key_name, nc_prefix, h_list in all_var_prefixes:
        for h in h_list:
            for stat_name, suffix in stats_map:
                col_name = f"{key_name}{h}_{season}_{stat_name}" if h is not None else f"{key_name}_{season}_{stat_name}"
                nc_file = find_nc_file(nc_folder, nc_prefix, h, suffix)
                
                if nc_file:
                    with xr.open_dataset(nc_file) as ds:
                        data_var = get_main_data_var(ds)
                        da = ds[data_var]
                        
                        values = da.squeeze().values.flatten()
                        df[col_name] = values[df["pixel_id"].values].astype(np.float32)
                else:
                    logging.debug(f"Arquivo NC ausente: {nc_prefix}_{h}_{suffix}.nc em {nc_folder}")

    # 2. PERFIS VERTICAIS
    if "ws" in target_vars and all(f"ws{h}_{season}_mean" in df.columns for h in HEIGHTS):
        ws_cols = [f"ws{h}_{season}_mean" for h in HEIGHTS]
        df["profile_heights"] = [HEIGHTS] * len(df)
        df["profile_means"] = df[ws_cols].values.tolist()

    if "wpd" in target_vars and all(f"wpd{h}_{season}_mean" in df.columns for h in HEIGHTS):
        wpd_cols = [f"wpd{h}_{season}_mean" for h in HEIGHTS]
        df["wpd_profile_means"] = df[wpd_cols].values.tolist()

    # 3. WEIBULL E ROSA DOS VENTOS VETORIZADA
    if "weibull" in target_vars or "wind_rose" in target_vars:
        df = process_wind_rose_and_weibull(df, nc_folder, target_vars)

    os.makedirs(out_dir, exist_ok=True)
    if "hilbert_key" in df.columns:
        df = df.drop(columns=["hilbert_key"])

    # Tratamento final: certificar de remover nulos
    ref_col = f"ws100_{season}_mean"
    if ref_col in df.columns:
        df = df.dropna(subset=[ref_col]).reset_index(drop=True)

    table = pa.Table.from_pandas(df)
    
    pq.write_table(
        table,
        out_path,
        compression="ZSTD",
        compression_level=6,
        use_dictionary=["state", "bathy_zone", "season"],
        row_group_size=10_000,
        write_statistics=True
    )
    logging.info(f"Salvo: {out_path} ({os.path.getsize(out_path) / (1024*1024):.2f} MB)")

    # 4. EXPORTAR SUMMARY CORE
    if season == "ANNUAL":
        summary_cols = ["pixel_id", "lat", "lon", "state", "bathy_zone", "distance_nm", "ws100_ANNUAL_mean", "wpd100_ANNUAL_mean"]
        available_summary_cols = [c for c in summary_cols if c in df.columns]
        summary_df = df[available_summary_cols]
        pq.write_table(
            pa.Table.from_pandas(summary_df),
            os.path.join(out_dir, "summary_annual.parquet"),
            compression="ZSTD",
            compression_level=6,
            use_dictionary=["state", "bathy_zone"],
            row_group_size=10_000,
            write_statistics=True
        )
        logging.info(f"Salvo (Summary Core): {os.path.join(out_dir, 'summary_annual.parquet')}")

# ==============================================================================
# MAIN
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="Gerador GeoParquet v3 Otimizado")
    parser.add_argument("-m", "--model", default="all", choices=["wrf", "mpas", "all"])
    parser.add_argument("-e", "--exp", default="all", choices=["era5", "hist", "ssp245", "ssp585", "all"])
    parser.add_argument("-v", "--vars", default="all", help="ws,wpd,weibull,wind_rose ou 'all'")
    parser.add_argument("-d", "--dry-run", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)

    models = ALL_MODELS if args.model == "all" else [args.model]
    exps = ALL_EXPS if args.exp == "all" else [args.exp]
    target_vars = ALL_VARS if args.vars == "all" else [v.strip().lower() for v in args.vars.split(",")]

    spatial_cache = {}

    for model in models:
        for exp in exps:
            if model not in spatial_cache and not args.dry_run:
                # Usa um arquivo avg de amostra para definir offshore/onshore
                sample_nc_list = glob.glob(f"{BASE_NC_DIR}/{model}/{exp}/anual/WS_100_avg.nc")
                if not sample_nc_list:
                    sample_nc_list = glob.glob(f"{BASE_NC_DIR}/{model}/{exp}/**/*.nc", recursive=True)
                
                if not sample_nc_list:
                    logging.error(f"Grade não encontrada para {model}/{exp}")
                    continue
                
                with xr.open_dataset(sample_nc_list[0]) as ds_grid:
                    lat_key = next((k for k in ["XLAT", "lat", "latitude"] if k in ds_grid), None)
                    lon_key = next((k for k in ["XLONG", "lon", "longitude"] if k in ds_grid), None)
                    lats = ds_grid[lat_key].values.flatten()
                    lons = ds_grid[lon_key].values.flatten()
                
                logging.info(f"Calculando Spatial Join & Filtro Offshore para {model.upper()}...")
                spatial_cache[model] = load_and_filter_spatial_metadata(lats, lons, sample_nc_list[0])

            spatial_df = spatial_cache.get(model, pd.DataFrame())
            
            for season in SEASONS:
                build_partition(model, exp, season, spatial_df, target_vars, dry_run=args.dry_run)

    logging.info("🎉 Processamento v3 concluído!")

if __name__ == "__main__":
    main()
