#!/bin/bash
set -euo pipefail

# ==============================================================================
# CNPq WebGIS Offshore - HPC CDO Stats Generator v3
# ==============================================================================
# Calcula min, max, mean, std e percentis (p5, p50, p95, p99).
# Salva a série temporal (U, V, WS) no diretório final para o Python (Rosa/Weibull).
# Inclui processamento sazonal completo.
# ==============================================================================

export HDF5_DISABLE_VERSION_CHECK=1
export H5_ERR_LEVEL=0
export HDF5_LOG=off
export HDF5_USE_FILE_LOCKING=FALSE
export NC_BLANK_FILLVAL=1

if command -v module &>/dev/null; then
    module load anaconda3 2>/dev/null || true
fi
if [ -f "$HOME/miniforge3/bin/activate" ]; then
    source "$HOME/miniforge3/bin/activate" cimatec2026 2>/dev/null || true
elif [ -f "$HOME/miniconda3/bin/activate" ]; then
    source "$HOME/miniconda3/bin/activate" cimatec2026 2>/dev/null || true
fi

THREADS="${SLURM_CPUS_PER_TASK:-16}"
TARGET_MODEL=""
TARGET_EXP=""

usage() {
    echo "Uso: $0 -m <wrf|mpas> -e <era5|hist|ssp245|ssp585>"
    exit 1
}

while getopts "m:e:h" opt; do
    case ${opt} in
        m) TARGET_MODEL="${OPTARG,,}" ;;
        e) TARGET_EXP="${OPTARG,,}" ;;
        h|*) usage ;;
    esac
done

if [[ -z "${TARGET_MODEL}" || -z "${TARGET_EXP}" ]]; then
    usage
fi

MODEL_PREFIX="${TARGET_MODEL^^}"
BASE_PATH="../../nc_${TARGET_MODEL}_zee/concat/aligned"
OUT_ANUAL="/scratch/projetos/cnpq-offshore/dados/resultados/2025_report/webgis_final/nc/${TARGET_MODEL}/${TARGET_EXP}/anual"
OUT_SAZONAL="/scratch/projetos/cnpq-offshore/dados/resultados/2025_report/webgis_final/nc/${TARGET_MODEL}/${TARGET_EXP}/sazonal"

TMP_DIR="${SLURM_TMPDIR:-/tmp}/job_stats_${SLURM_JOB_ID:-$$}_${TARGET_MODEL}_${TARGET_EXP}"
mkdir -p "${OUT_ANUAL}" "${OUT_SAZONAL}" "${TMP_DIR}"

trap 'rm -rf "${TMP_DIR}"' EXIT

echo "=================================================================="
echo " 🚀 INÍCIO GERAÇÃO STATS CDO: Modelo=${MODEL_PREFIX} | Exp=${TARGET_EXP^^} | Threads=${THREADS}"
echo " TMP_DIR Local: ${TMP_DIR}"
echo "=================================================================="

# ATENÇÃO: Adicionada proteção (ternário) no cálculo de ALPHA para evitar log(0) e divisão por zero!
CDO_EXPR="
g=9.80665; p0=100000; kappa=0.28591;
P_10_OUT = P10; T_2_OUT = T2; T_50_OUT = T50; T_100_OUT = T100; T_150_OUT = T150; T_200_OUT = T200;
RHO_10_OUT = RHO10; RHO_50_OUT = RHO50; RHO_100_OUT = RHO100; RHO_150_OUT = RHO150; RHO_200_OUT = RHO200;
WS_10_OUT = WS10; WS_50_OUT = WS50; WS_100_OUT = WS100; WS_150_OUT = WS150; WS_200_OUT = WS200;
WPD_10_OUT = WPD10; WPD_50_OUT = WPD50; WPD_100_OUT = WPD100; WPD_150_OUT = WPD150; WPD_200_OUT = WPD200;
U_10_OUT = U10; U_50_OUT = U50; U_100_OUT = U100; U_150_OUT = U150; U_200_OUT = U200;
V_10_OUT = V10; V_50_OUT = V50; V_100_OUT = V100; V_150_OUT = V150; V_200_OUT = V200;
P_50_OUT = P10 - g * 0.5 * (RHO10 + RHO50) * 40;
P_100_OUT = P_50_OUT - g * 0.5 * (RHO50 + RHO100) * 50;
P_150_OUT = P_100_OUT - g * 0.5 * (RHO100 + RHO150) * 50;
P_200_OUT = P_150_OUT - g * 0.5 * (RHO150 + RHO200) * 50;
THETA_10_OUT = (T2 + 273.15) * ((p0 / P10) ^ kappa);
THETA_50_OUT = (T50 + 273.15) * ((p0 / P_50_OUT) ^ kappa);
THETA_100_OUT = (T100 + 273.15) * ((p0 / P_100_OUT) ^ kappa);
THETA_150_OUT = (T150 + 273.15) * ((p0 / P_150_OUT) ^ kappa);
THETA_200_OUT = (T200 + 273.15) * ((p0 / P_200_OUT) ^ kappa);
G_10_200_OUT = (THETA_200_OUT - THETA_10_OUT) / 190.0;
THETA_BAR = 0.5 * (THETA_10_OUT + THETA_200_OUT);
N2_10_200_OUT = (g / THETA_BAR) * G_10_200_OUT;
ALPHA_10_100_OUT = log((WS100 < 0.001 ? 0.001 : WS100) / (WS10 < 0.001 ? 0.001 : WS10)) / log(100.0 / 10.0);
ALPHA_10_200_OUT = log((WS200 < 0.001 ? 0.001 : WS200) / (WS10 < 0.001 ? 0.001 : WS10)) / log(200.0 / 10.0);
"

years=($(ls ${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_P10_*.nc | sed -E 's/.*_([0-9]{4})\.nc/\1/' | sort -u))

echo "📅 Processando ${#years[@]} anos..."

for yr in "${years[@]}"; do
    cdo -s -P ${THREADS} -b F32 -z zip1 -O \
        -select,name=P_10_OUT,T_2_OUT,T_50_OUT,T_100_OUT,T_150_OUT,T_200_OUT,RHO_10_OUT,RHO_50_OUT,RHO_100_OUT,RHO_150_OUT,RHO_200_OUT,WS_10_OUT,WS_50_OUT,WS_100_OUT,WS_150_OUT,WS_200_OUT,WPD_10_OUT,WPD_50_OUT,WPD_100_OUT,WPD_150_OUT,WPD_200_OUT,U_10_OUT,U_50_OUT,U_100_OUT,U_150_OUT,U_200_OUT,V_10_OUT,V_50_OUT,V_100_OUT,V_150_OUT,V_200_OUT,THETA_10_OUT,THETA_50_OUT,THETA_100_OUT,THETA_150_OUT,THETA_200_OUT,G_10_200_OUT,N2_10_200_OUT,P_50_OUT,P_100_OUT,P_150_OUT,P_200_OUT,ALPHA_10_100_OUT,ALPHA_10_200_OUT \
        -expr,"${CDO_EXPR}" \
        -merge [ \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_P10_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_T2_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_T50_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_T100_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_T150_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_T200_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_RHO10_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_RHO50_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_RHO100_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_RHO150_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_RHO200_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WS10_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WS50_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WS100_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WS150_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WS200_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WPD10_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WPD50_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WPD100_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WPD150_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_WPD200_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_U10_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_U50_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_U100_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_U150_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_U200_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_V10_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_V50_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_V100_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_V150_${yr}.nc" \
        "${BASE_PATH}/${TARGET_EXP}/${MODEL_PREFIX}_${TARGET_EXP}_V200_${yr}.nc" \
        ] "${TMP_DIR}/stab_${yr}.nc"
done

echo "🔄 Concatenando séries temporais..."
cdo -s -P ${THREADS} -O -mergetime "${TMP_DIR}/stab_*.nc" "${TMP_DIR}/full_series.nc"

export_stat() {
    local src_file=$1
    local dest_dir=$2
    local suffix=$3

    cdo -s splitname "${src_file}" "${TMP_DIR}/split_${suffix}_"
    for f in "${TMP_DIR}"/split_${suffix}_*.nc; do
        [ -e "$f" ] || continue
        var_name=$(basename "$f" .nc | sed "s/^split_${suffix}_//")
        clean_var=${var_name/_OUT/}
        mv "$f" "${dest_dir}/${clean_var}_${suffix}.nc"
    done
}

process_stats() {
    local series_file=$1
    local out_dir=$2
    
    mkdir -p "${out_dir}"
    echo "📊 Processando estatísticas para: ${out_dir}"
    
    # Mínimo e Máximo
    cdo -s -P ${THREADS} -b F32 -z zip1 -O -timmin "${series_file}" "${TMP_DIR}/series_min.nc"
    cdo -s -P ${THREADS} -b F32 -z zip1 -O -timmax "${series_file}" "${TMP_DIR}/series_max.nc"
    
    # Média e Desvio Padrão
    cdo -s -P ${THREADS} -b F32 -z zip1 -O -timmean "${series_file}" "${TMP_DIR}/series_mean.nc"
    cdo -s -P ${THREADS} -b F32 -z zip1 -O -timstd "${series_file}" "${TMP_DIR}/series_std.nc"
    
    # Percentis p5, p50, p95, p99
    for p in 5 50 95 99; do
        cdo -s -P ${THREADS} -b F32 -z zip1 -O -timpctl,$p "${series_file}" "${TMP_DIR}/series_min.nc" "${TMP_DIR}/series_max.nc" "${TMP_DIR}/series_p${p}.nc"
    done
    
    # Exportando todos os arquivos renomeados
    export_stat "${TMP_DIR}/series_mean.nc" "${out_dir}" "avg"
    export_stat "${TMP_DIR}/series_std.nc" "${out_dir}" "std"
    export_stat "${TMP_DIR}/series_min.nc" "${out_dir}" "min"
    export_stat "${TMP_DIR}/series_max.nc" "${out_dir}" "max"
    export_stat "${TMP_DIR}/series_p5.nc" "${out_dir}" "p5"
    export_stat "${TMP_DIR}/series_p50.nc" "${out_dir}" "p50"
    export_stat "${TMP_DIR}/series_p95.nc" "${out_dir}" "p95"
    export_stat "${TMP_DIR}/series_p99.nc" "${out_dir}" "p99"
}

# ==============================================================================
# 1. Processar Anual
# ==============================================================================
process_stats "${TMP_DIR}/full_series.nc" "${OUT_ANUAL}"

echo "💾 Exportando série temporal completa de U, V e WS para o Python (Anual)..."
cdo -s -P ${THREADS} -b F32 -z zip1 -O -select,name=U_10_OUT,U_50_OUT,U_100_OUT,U_150_OUT,U_200_OUT,V_10_OUT,V_50_OUT,V_100_OUT,V_150_OUT,V_200_OUT,WS_10_OUT,WS_50_OUT,WS_100_OUT,WS_150_OUT,WS_200_OUT "${TMP_DIR}/full_series.nc" "${OUT_ANUAL}/time_series_uvws.nc"

# ==============================================================================
# 2. Processar Sazonal (Estações do Ano)
# ==============================================================================
echo "🍁 Separando por estações do ano..."
cdo -s -P ${THREADS} -O splitseas "${TMP_DIR}/full_series.nc" "${TMP_DIR}/season_"

for seas in DJF MAM JJA SON; do
    if [ -f "${TMP_DIR}/season_${seas}.nc" ]; then
        seas_lower="${seas,,}"
        seas_dir="${OUT_SAZONAL}/${seas_lower}"
        mkdir -p "${seas_dir}"
        
        process_stats "${TMP_DIR}/season_${seas}.nc" "${seas_dir}"
        
        echo "💾 Exportando série temporal de U, V e WS para o Python (Sazonal ${seas})..."
        cdo -s -P ${THREADS} -b F32 -z zip1 -O -select,name=U_10_OUT,U_50_OUT,U_100_OUT,U_150_OUT,U_200_OUT,V_10_OUT,V_50_OUT,V_100_OUT,V_150_OUT,V_200_OUT,WS_10_OUT,WS_50_OUT,WS_100_OUT,WS_150_OUT,WS_200_OUT "${TMP_DIR}/season_${seas}.nc" "${seas_dir}/time_series_uvws.nc"
    fi
done

echo "=================================================================="
echo " ✅ CONCLUÍDO: Estatísticas e Séries Temporais geradas para ${TARGET_MODEL} ${TARGET_EXP}!"
echo "=================================================================="
