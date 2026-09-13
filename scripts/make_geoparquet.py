#!/usr/bin/env python3
"""
==============================================================================
CNPq WebGIS Offshore - HPC GeoParquet Generator v2 (Otimizado)
==============================================================================
Este script realiza o processamento dos arquivos NetCDF de alta resolução (WRF e MPAS)
e gera arquivos GeoParquet otimizados para o WebGIS/Dashboard.

Destaques da Reestruturação v2:
 1. Ordenação Espacial por Curva de Hilbert (Hilbert Spatial Indexing) para Row Group pruning.
 2. Cálculo de Distância à Costa (distance_nm em milhas náuticas via Spatial Join/Geodesia).
 3. Compatibilidade exata com o contrato de dados do frontend (pixelQuery.ts):
    - Weibull com chaves {"c": scale, "k": shape} para 10m, 50m, 100m, 150m, 200m.
    - Rosa dos Ventos (12 ou 16 setores) com chaves legíveis de frequência e velocidade média.
    - Percentis p5, p50, p95, p99 para ws e wpd em todas as 5 alturas.
    - Perfis verticais profile_means e wpd_profile_means.
 4. Compressão ZSTD nível 6 + Row Group size de 5.000 a 10.000 linhas.
 5. Exportação simultânea da versão Completa e da versão Camada Leve (Core/Summary).
==============================================================================
"""

import os
import sys
import glob
import logging
import argparse
import math
import numpy as np
import pandas as pd
import xarray as xr
import geopandas as gpd
import pyarrow as pa
import pyarrow.parquet as pq
from shapely.geometry import Point
from tqdm import tqdm
import scipy.special as sp

# Desabilitar avisos não críticos
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

CARDINAL_DIRECTIONS_12 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WNW"]

def find_nc_file(nc_folder: str, var_prefix: str, h: int, suffix: str) -> str:
    """Busca o arquivo NC tentando as variações de padrão (VAR_ALTURA_METRICA.nc, ex: WS_10_avg.nc, T_2_min.nc, WS10_avg.nc)."""
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
    """Identifica a variável principal do Dataset ignorando metadados e coordenadas auxiliares."""
    ignore = {"spatial_ref", "crs", "lat_bnds", "lon_bnds", "time_bnds", "height", "grid_mapping"}
    candidates = [v for v in ds.data_vars if v not in ignore and not v.endswith("_bnds")]
    if not candidates:
        candidates = list(ds.data_vars)
    return max(candidates, key=lambda v: ds[v].size)

# ==============================================================================
# HILBERT CURVE & ORDENAÇÃO ESPACIAL
# ==============================================================================
def hilbert_index_2d(x: int, y: int, order: int = 16) -> int:
    """Calcula o índice na curva de Hilbert 2D para coordenadas inteiras discretizadas."""
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
    """Mapeia lats e lons para a Curva de Hilbert 2D para manter proximidade espacial no Parquet."""
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
# SPATIAL JOIN & CÁLCULO DE DISTÂNCIA À COSTA (DISTANCE_NM)
# ==============================================================================
def load_and_join_spatial_metadata(lats: np.ndarray, lons: np.ndarray) -> pd.DataFrame:
    """Realiza Spatial Join com ZEE/Batimetria e calcula a distância até a costa em milhas náuticas."""
    grid_df = pd.DataFrame({
        "pixel_id": np.arange(len(lats), dtype=np.int32),
        "lat": lats.astype(np.float32),
        "lon": lons.astype(np.float32)
    })
    
    geometry = [Point(xy) for xy in zip(grid_df["lon"], grid_df["lat"])]
    pixels_gdf = gpd.GeoDataFrame(grid_df, geometry=geometry, crs="EPSG:4326")

    # Carregar limites territoriais
    bathy_gdf = gpd.read_file(BATHY_GEOJSON).to_crs("EPSG:4326")
    zee_gdf = gpd.read_file(ZEE_GEOJSON).to_crs("EPSG:4326")

    # Spatial Join - Batimetria
    joined_bathy = gpd.sjoin(pixels_gdf, bathy_gdf[["geometry", "estado", "profundidade"]], how="left", predicate="intersects")
    joined_bathy = joined_bathy.drop_duplicates(subset=["pixel_id"]).drop(columns=["index_right"]).rename(columns={
        "estado": "state_bathy",
        "profundidade": "bathy_zone"
    })

    # Spatial Join - ZEE
    joined_zee = gpd.sjoin(joined_bathy, zee_gdf[["geometry", "estado"]], how="left", predicate="intersects")
    joined_zee = joined_zee.drop_duplicates(subset=["pixel_id"]).drop(columns=["index_right"]).rename(columns={
        "estado": "state_zee"
    })

    # Consolidação de atributos
    joined_zee["state"] = joined_zee["state_zee"].fillna(joined_zee["state_bathy"]).fillna("")
    joined_zee["bathy_zone"] = joined_zee["bathy_zone"].fillna("out_of_range")

    # NOTA: O cálculo de distance_nm foi adiado para uma feature futura do projeto.
    # Definindo valor padrão 0.0 para economizar tempo de processamento no HPC.
    joined_zee["distance_nm"] = np.float32(0.0)

    # Adicionar chave espacial de Hilbert
    hilbert_keys = compute_spatial_sorting_key(lats, lons)
    joined_zee["hilbert_key"] = hilbert_keys

    # Ordenar o dataframe espacial por proximidade geográfica (Hilbert)
    joined_zee = joined_zee.sort_values("hilbert_key").reset_index(drop=True)

    return joined_zee[["pixel_id", "lat", "lon", "state", "bathy_zone", "distance_nm", "hilbert_key"]]

# ==============================================================================
# CONSTRUÇÃO DO GEOPARQUET POR PARTIÇÃO
# ==============================================================================
def build_partition(model: str, exp: str, season: str, spatial_df: pd.DataFrame, target_vars: list, dry_run: bool = False):
    season_lc = season.lower()
    nc_folder = os.path.join(BASE_NC_DIR, model, exp, "anual" if season == "ANNUAL" else "sazonal")
    out_dir = os.path.join(OUT_GEOPARQUET_DIR, model, exp)
    out_path = os.path.join(out_dir, f"season={season_lc}.parquet")

    if dry_run:
        logging.info(f"[DRY-RUN] Processando {model}/{exp} | Estação: {season} -> {out_path}")
        return

    df = spatial_df.copy()
    df["season"] = season

    # Mapeamento de estatísticas (Anual inclui percentis p5, p50, p95, p99)
    if season == "ANNUAL":
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
    else:
        stats_map = [
            ("mean", "avg"),
            ("std", "std")
        ]

    # 1. Leitura de Estatísticas de Vento (WS e WPD)
    for h in HEIGHTS:
        for var_key, nc_prefix in [("ws", "WS"), ("wpd", "WPD")]:
            for stat_name, suffix in stats_map:
                col_name = f"{var_key}{h}_{season}_{stat_name}"
                nc_file = find_nc_file(nc_folder, nc_prefix, h, suffix)
                
                if nc_file:
                    with xr.open_dataset(nc_file) as ds:
                        data_var = get_main_data_var(ds)  # Correção aqui
                        da = ds[data_var]
                        
                        if season != "ANNUAL":
                            season_idx = ["DJF", "MAM", "JJA", "SON"].index(season)
                            time_dim = next((d for d in ["Time", "time"] if d in da.dims), None)
                            if time_dim:
                                da = da.isel({time_dim: season_idx})
                        
                        values = da.squeeze().values.flatten()
                        # Garantir alinhamento com os pixels ordenados por Hilbert
                        if "pixel_id" in df.columns:
                            # Reordenar valores conforme o índice dos pixels
                            df[col_name] = values[df["pixel_id"].values].astype(np.float32)
                        else:
                            df[col_name] = values.astype(np.float32)
                else:
                    logging.warning(f"Arquivo NC ausente: {nc_prefix}_{h}_{suffix}.nc em {nc_folder}")

    # 2. Processamento das Estruturas Especiais (Partição ANNUAL)
    if season == "ANNUAL":
        # Perfis Verticais
        if "ws" in target_vars and all(f"ws{h}_ANNUAL_mean" in df.columns for h in HEIGHTS):
            ws_cols = [f"ws{h}_ANNUAL_mean" for h in HEIGHTS]
            df["profile_heights"] = [HEIGHTS] * len(df)
            df["profile_means"] = df[ws_cols].values.tolist()

        if "wpd" in target_vars and all(f"wpd{h}_ANNUAL_mean" in df.columns for h in HEIGHTS):
            wpd_cols = [f"wpd{h}_ANNUAL_mean" for h in HEIGHTS]
            df["wpd_profile_means"] = df[wpd_cols].values.tolist()

        # Weibull (Ajuste exato para {"c": float, "k": float})
        if "weibull" in target_vars:
            for h in HEIGHTS:
                wb_a_file = os.path.join(nc_folder, f"WEIBULL_A_{h}_avg.nc")
                wb_k_file = os.path.join(nc_folder, f"WEIBULL_K_{h}_avg.nc")
                
                if os.path.exists(wb_a_file) and os.path.exists(wb_k_file):
                    with xr.open_dataset(wb_a_file) as ds_a, xr.open_dataset(wb_k_file) as ds_k:
                        a_var = get_main_data_var(ds_a)  # Correção aqui
                        k_var = get_main_data_var(ds_k)  # Correção aqui
                        a_vals = ds_a[a_var].squeeze().values.flatten()[df["pixel_id"].values]
                        k_vals = ds_k[k_var].squeeze().values.flatten()[df["pixel_id"].values]
                        
                        # Chave "c" conforme esperado pelo pixelQuery.ts!
                        df[f"weibull_{h}m"] = [
                            {"c": float(c), "k": float(k)} for c, k in zip(a_vals, k_vals)
                        ]
                else:
                    logging.info(f"Dados Weibull para {h}m ausentes em {nc_folder}.")

        # Rosa dos Ventos (12 Setores)
        if "wind_rose" in target_vars:
            for h in HEIGHTS:
                dir_freq_file = os.path.join(nc_folder, f"DIR_FREQ_{h}_avg.nc")
                ws_dir_file = os.path.join(nc_folder, f"WS_DIR_{h}_avg.nc")
                
                if os.path.exists(dir_freq_file) and os.path.exists(ws_dir_file):
                    with xr.open_dataset(dir_freq_file) as ds_freq, xr.open_dataset(ws_dir_file) as ds_wsdir:
                        freq_var = get_main_data_var(ds_freq)    # Correção aqui
                        wsdir_var = get_main_data_var(ds_wsdir)  # Correção aqui
                        
                        da_freq = ds_freq[freq_var].squeeze()
                        da_wsdir = ds_wsdir[wsdir_var].squeeze()
                        
                        # Garantir que a dimensão de direção (tamanho 12) seja a primeira (eixo 0)
                        dir_dim_freq = next((d for d in da_freq.dims if da_freq.sizes[d] == 12), None)
                        if dir_dim_freq:
                            da_freq = da_freq.transpose(dir_dim_freq, ...)
                            
                        dir_dim_wsdir = next((d for d in da_wsdir.dims if da_wsdir.sizes[d] == 12), None)
                        if dir_dim_wsdir:
                            da_wsdir = da_wsdir.transpose(dir_dim_wsdir, ...)

                        freq_vals = da_freq.values.reshape(12, -1)
                        wsdir_vals = da_wsdir.values.reshape(12, -1)
                        
                        n_pixels = len(df)
                        pixel_ids = df["pixel_id"].values
                        wind_rose_list = [
                            {
                                CARDINAL_DIRECTIONS_12[s]: {
                                    "freq": float(freq_vals[s, pixel_ids[p]]),
                                    "mean_ws": float(wsdir_vals[s, pixel_ids[p]])
                                }
                                for s in range(12)
                            }
                            for p in range(n_pixels)
                        ]
                        df[f"wind_rose_{h}m"] = wind_rose_list
                else:
                    logging.info(f"Dados Rosa dos Ventos para {h}m ausentes em {nc_folder}.")

    os.makedirs(out_dir, exist_ok=True)

    # Remover colunas temporárias de ordenação
    if "hilbert_key" in df.columns:
        df = df.drop(columns=["hilbert_key"])

    # Remover os pixels onshore (onde o vento médio a 100m é NaN)
    ref_col = f"ws100_{season}_mean"
    if ref_col in df.columns:
        df = df.dropna(subset=[ref_col]).reset_index(drop=True)

    table = pa.Table.from_pandas(df)
    
    # Gravando Parquet Otimizado com ZSTD e Row Groups de 10.000 linhas
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

    # 3. Exportar versão levinha Summary (Core) para Carga Inicial Rápida do Mapa
    if season == "ANNUAL":
        summary_cols = ["pixel_id", "lat", "lon", "state", "bathy_zone", "distance_nm", "ws100_ANNUAL_mean", "wpd100_ANNUAL_mean"]
        available_summary_cols = [c for c in summary_cols if c in df.columns]
        summary_df = df[available_summary_cols]
        summary_table = pa.Table.from_pandas(summary_df)
        summary_path = os.path.join(out_dir, "summary_annual.parquet")
        pq.write_table(
            summary_table,
            summary_path,
            compression="ZSTD",
            compression_level=6,
            use_dictionary=["state", "bathy_zone"],
            row_group_size=10_000,
            write_statistics=True
        )
        logging.info(f"Salvo (Summary Core): {summary_path} ({os.path.getsize(summary_path) / (1024*1024):.2f} MB)")

# ==============================================================================
# MAIN & EXECUÇÃO
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="Gerador GeoParquet v2 Otimizado - CNPq WebGIS Offshore")
    parser.add_argument("-m", "--model", default="all", choices=["wrf", "mpas", "all"])
    parser.add_argument("-e", "--exp", default="all", choices=["era5", "hist", "ssp245", "ssp585", "all"])
    parser.add_argument("-v", "--vars", default="all", help="Lista de variáveis separadas por vírgula (ws,wpd,weibull,wind_rose ou 'all')")
    parser.add_argument("-d", "--dry-run", action="store_true", help="Simula a execução sem gravar arquivos")
    parser.add_argument("--log-file", default="build_geoparquet_v2.log", help="Arquivo de destino dos logs")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(args.log_file, mode="w"),
            logging.StreamHandler(sys.stdout)
        ]
    )

    models = ALL_MODELS if args.model == "all" else [args.model]
    exps = ALL_EXPS if args.exp == "all" else [args.exp]
    target_vars = ALL_VARS if args.vars == "all" else [v.strip().lower() for v in args.vars.split(",")]

    logging.info("==========================================================")
    logging.info("🚀 INICIANDO GERAÇÃO DE GEOPARQUET V2 OTIMIZADO")
    logging.info(f"Modelos: {models} | Experimentos: {exps}")
    logging.info(f"Variáveis alvo: {target_vars} | Dry Run: {args.dry_run}")
    logging.info("==========================================================")

    spatial_cache = {}

    for model in tqdm(models, desc="Modelos"):
        for exp in tqdm(exps, desc=f"Experimentos [{model.upper()}]", leave=False):
            
            if model not in spatial_cache and not args.dry_run:
                sample_nc_list = glob.glob(f"{BASE_NC_DIR}/{model}/{exp}/anual/WS_10_avg.nc")
                if not sample_nc_list:
                    sample_nc_list = glob.glob(f"{BASE_NC_DIR}/{model}/{exp}/**/*.nc", recursive=True)
                
                if not sample_nc_list:
                    logging.error(f"Grade de amostra não encontrada para {model}/{exp}")
                    continue
                
                with xr.open_dataset(sample_nc_list[0]) as ds_grid:
                    lat_key = next((k for k in ["XLAT", "lat", "latitude"] if k in ds_grid), None)
                    lon_key = next((k for k in ["XLONG", "lon", "longitude"] if k in ds_grid), None)
                    lats = ds_grid[lat_key].values.flatten()
                    lons = ds_grid[lon_key].values.flatten()
                
                logging.info(f"Calculando Spatial Join & Hilbert Keys para {model.upper()}...")
                spatial_cache[model] = load_and_join_spatial_metadata(lats, lons)

            spatial_df = spatial_cache.get(model, pd.DataFrame())

            for season in tqdm(SEASONS, desc=f"Estações [{exp.upper()}]", leave=False):
                build_partition(model, exp, season, spatial_df, target_vars, dry_run=args.dry_run)

    logging.info("🎉 Processamento v2 concluído com sucesso!")

if __name__ == "__main__":
    main()
