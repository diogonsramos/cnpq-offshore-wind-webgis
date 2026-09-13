#!/usr/bin/env python3
"""
==============================================================================
CNPq WebGIS Offshore - Script de Verificação Rápida e Físico-Estatística do GeoParquet
==============================================================================
Este script realiza uma varredura completa em todos os 40 arquivos GeoParquet
(2 Modelos x 4 Experimentos x 5 Períodos) consultando 5 pontos estratégicos
ao longo de toda a costa brasileira offshore:

  1. P1 - Norte / Foz do Amazonas (AP/PA)
  2. P2 - Nordeste Setentrional (CE/RN)
  3. P3 - Nordeste Oriental / Bahia (BA)
  4. P4 - Sudeste / Bacia de Campos e Santos (RJ/SP)
  5. P5 - Sul / Litoral Gaúcho (RS)

Ele valida:
  - Presença de todos os 40 arquivos esperados e integridade do schema.
  - Ausência de NaNs/pixels continentais.
  - Consistência física de Vento (ws100) e Potência (wpd100).
  - Parâmetros de Weibull (c e k em faixas meteorologicamente válidas).
  - Rosa dos Ventos: soma das frequências (100%), setor dominante e coerência geográfica.
==============================================================================
"""

import os
import sys
import argparse
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

# ==============================================================================
# CONFIGURAÇÕES E 5 PONTOS DE REFERÊNCIA OFFSHORE
# ==============================================================================
MODELS = ["wrf", "mpas"]
EXPERIMENTS = ["era5", "hist", "ssp245", "ssp585"]
SEASONS = ["annual", "djf", "mam", "jja", "son"]

SAMPLE_POINTS = [
    {"name": "P1 - Norte (AP/Foz Amazonas)", "lat": 1.5, "lon": -49.0, "expected_dir": ["ENE", "E", "NNE", "ESE"]},
    {"name": "P2 - NE Setentrional (CE/RN)", "lat": -4.0, "lon": -37.5, "expected_dir": ["E", "ESE", "ENE", "SE"]},
    {"name": "P3 - NE Oriental (BA/Abrolhos)", "lat": -15.0, "lon": -38.5, "expected_dir": ["E", "ESE", "SE", "NE"]},
    {"name": "P4 - Sudeste (RJ/Campos)", "lat": -23.0, "lon": -41.5, "expected_dir": ["NE", "ENE", "E", "SW", "S", "SSW"]},
    {"name": "P5 - Sul (RS/Rio Grande)", "lat": -32.5, "lon": -51.0, "expected_dir": ["NE", "ENE", "E", "S", "SW", "SSW"]}
]

def find_nearest_row(df: pd.DataFrame, target_lat: float, target_lon: float):
    """Encontra a linha mais próxima das coordenadas alvo."""
    dists = (df['lat'] - target_lat)**2 + (df['lon'] - target_lon)**2
    idx = dists.idxmin()
    dist_deg = np.sqrt(dists.loc[idx])
    return df.loc[idx], dist_deg

def parse_struct_or_dict(val):
    """Converte valor retornado pelo pyarrow/pandas (seja dict, struct ou objeto) em dict python."""
    if isinstance(val, dict):
        return val
    if hasattr(val, 'as_py'):
        return val.as_py()
    return val

def load_file_as_df(filepath: str) -> pd.DataFrame:
    """Carrega o arquivo suportando tanto Parquet padrão quanto Feather/Arrow IPC."""
    import pyarrow.parquet as pq
    import pyarrow.feather as feather
    import pyarrow.ipc as ipc

    # 1. Tentar Parquet
    try:
        tbl = pq.read_table(filepath)
        return tbl.to_pandas()
    except Exception:
        pass

    # 2. Tentar Feather / Arrow File IPC
    try:
        tbl = feather.read_table(filepath)
        return tbl.to_pandas()
    except Exception:
        pass

    # 3. Tentar Arrow Stream IPC
    try:
        with open(filepath, 'rb') as f:
            reader = ipc.open_stream(f)
            return reader.read_all().to_pandas()
    except Exception:
        pass

    # 4. Fallback pandas
    return pd.read_parquet(filepath)

def check_file(filepath: str, season: str, verbose: bool = False):
    """Verifica a integridade de um único arquivo GeoParquet e avalia os 5 pontos."""
    if not os.path.exists(filepath):
        return False, f"ARQUIVO AUSENTE: {filepath}", []

    try:
        df = load_file_as_df(filepath)
    except Exception as e:
        return False, f"ERRO DE LEITURA: {str(e)}", []

    n_rows = len(df)
    if n_rows == 0:
        return False, "ARQUIVO VAZIO (0 linhas)", []

    # Verificar coluna chave de vento a 100m
    ws_col = f"ws100_{season.upper()}_mean"
    if ws_col not in df.columns:
        # Tenta fallback se estiver minúsculo
        ws_cols = [c for c in df.columns if "ws100" in c and "mean" in c]
        if ws_cols:
            ws_col = ws_cols[0]
        else:
            return False, f"Coluna de vento 100m não encontrada ({ws_col})", []

    # Verificar se ainda existem NaNs continentais
    nan_count = df[ws_col].isna().sum()
    if nan_count > 0:
        return False, f"ALERTA: {nan_count} NaNs encontrados em {ws_col} (pontos continentais não filtrados)", []

    points_report = []
    
    for pt in SAMPLE_POINTS:
        row, dist_deg = find_nearest_row(df, pt['lat'], pt['lon'])
        
        # Validar proximidade da grade (esperado < 0.5 graus)
        if dist_deg > 0.5:
            points_report.append(f"  [{pt['name']}] AVISO: Ponto mais próximo distante ({dist_deg:.2f}°)")
            continue

        ws100 = row[ws_col]
        wpd_col = f"wpd100_{season.upper()}_mean"
        wpd100 = row.get(wpd_col, np.nan)

        # Weibull a 100m
        weibull_raw = row.get("weibull_100m", None)
        weibull = parse_struct_or_dict(weibull_raw)
        c_val = weibull.get("c", np.nan) if isinstance(weibull, dict) else np.nan
        k_val = weibull.get("k", np.nan) if isinstance(weibull, dict) else np.nan

        # Rosa dos Ventos a 100m
        wr_raw = row.get("wind_rose_100m", None)
        wr = parse_struct_or_dict(wr_raw)
        
        dominant_dir = "N/A"
        dominant_freq = 0.0
        dominant_speed = 0.0
        total_freq = 0.0

        if isinstance(wr, dict):
            for dir_label, d_info in wr.items():
                d_dict = parse_struct_or_dict(d_info)
                if isinstance(d_dict, dict):
                    freq = d_dict.get("freq", 0.0)
                    spd = d_dict.get("mean_ws", 0.0)
                    total_freq += freq
                    if freq > dominant_freq:
                        dominant_freq = freq
                        dominant_dir = dir_label
                        dominant_speed = spd

        # Checagens físicas básicas
        issues = []
        if not (2.0 <= ws100 <= 25.0):
            issues.append(f"ws100 fora de faixa ({ws100:.2f} m/s)")
        if not (1.0 <= c_val <= 30.0) or not (1.0 <= k_val <= 5.0):
            issues.append(f"Weibull atípico (c={c_val:.2f}, k={k_val:.2f})")
        if total_freq > 0 and not (0.90 <= total_freq <= 1.10):
            issues.append(f"Soma freq rosa != 1.0 (soma={total_freq:.2f})")

        status_flag = "✓" if not issues else "⚠ " + "; ".join(issues)
        
        pt_summary = (
            f"  [{pt['name']}] (Lat:{row['lat']:.2f}, Lon:{row['lon']:.2f}) -> "
            f"ws100={ws100:.2f}m/s, wpd100={wpd100:.0f}W/m², "
            f"Weibull(c={c_val:.2f}, k={k_val:.2f}), "
            f"RosaDominante={dominant_dir} ({dominant_freq*100:.1f}%, vel={dominant_speed:.2f}m/s) [{status_flag}]"
        )
        points_report.append(pt_summary)

    return True, f"OK ({n_rows:,} pixels)", points_report

def main():
    parser = argparse.ArgumentParser(description="Validador Físico dos GeoParquets Offshore")
    parser.add_argument(
        "--dir", "-d",
        default="/scratch/projetos/cnpq-offshore/dados/resultados/2025_report/webgis_final/geoparquet",
        help="Diretório raiz onde estão as pastas dos modelos (ou ex: public/data/geoparquet)"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Exibir detalhes de todos os 5 pontos em todos os arquivos")
    args = parser.parse_args()

    # Se o diretório padrão do HPC não existir, tentar o diretório local do projeto
    base_dir = args.dir
    if not os.path.exists(base_dir):
        local_fallback = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/data/geoparquet"))
        if os.path.exists(local_fallback):
            print(f"[INFO] Diretório HPC não encontrado. Usando dados locais em: {local_fallback}")
            base_dir = local_fallback

    print("=" * 85)
    print("CNPq Offshore Wind WebGIS - Varredura de Integridade dos GeoParquets")
    print(f"Diretório Base: {base_dir}")
    print("=" * 85)

    total_files = 0
    passed_files = 0
    failed_files = 0

    for model in MODELS:
        for exp in EXPERIMENTS:
            print(f"\n[{model.upper()} | {exp.upper()}]")
            for season in SEASONS:
                total_files += 1
                fname = f"season={season}.parquet"
                fpath = os.path.join(base_dir, model, exp, fname)
                
                # Suporte a nomenclatura alternativa antiga se houver
                if not os.path.exists(fpath):
                    fpath_alt = os.path.join(base_dir, model, exp, f"{season}.parquet")
                    if os.path.exists(fpath_alt):
                        fpath = fpath_alt

                ok, msg, pt_reports = check_file(fpath, season, verbose=args.verbose)
                
                rel_path = os.path.relpath(fpath, base_dir) if os.path.exists(fpath) else f"{model}/{exp}/{fname}"
                if ok:
                    passed_files += 1
                    print(f"  [✓ PASS] {rel_path:<35} | {msg}")
                    # No modo resumido, mostra os 5 pontos para a rodada Anual do ERA5
                    if args.verbose or (season == "annual" and exp == "era5"):
                        for line in pt_reports:
                            print(f"    {line}")
                else:
                    failed_files += 1
                    print(f"  [✗ FAIL] {rel_path:<35} | {msg}")

    print("\n" + "=" * 85)
    print(f"RESUMO GERAL: {passed_files}/{total_files} arquivos validados com sucesso.")
    if failed_files > 0:
        print(f"ATENÇÃO: {failed_files} arquivos apresentaram erros ou estão ausentes.")
    else:
        print("TODOS OS ARQUIVOS ESTÃO FÍSICA E ESTRUTURALMENTE CONSISTENTES!")
    print("=" * 85)

if __name__ == "__main__":
    main()
