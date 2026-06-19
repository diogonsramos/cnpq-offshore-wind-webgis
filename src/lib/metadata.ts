export interface FAQItem {
  q: string
  a: string
}

export interface ProjectInfo {
  funding: {
    title: string
    grantNumber: string
    description: string
    acknowledgment: string
  }
  techSummary: { label: string; value: string }[]
  team: string
  publications: string[]
  contact: string
}

export const FAQS: FAQItem[] = [
  { q: 'Quais são as fontes de dados do WebGIS?', a: 'Dados de vento do modelo WRF (Weather Research and Forecasting) forçado pela reanálise ERA5 do ECMWF e pelas projeções climáticas CMIP6 SSP2-4.5 e SSP5-8.5 com downscaling dinâmico para ~9 km de resolução (~0,07° de grade).' },
  { q: 'Qual a resolução espacial dos dados?', a: 'Grade regular de 534 colunas × 263 linhas (~140 mil células), resolução do modelo WRF de ~9 km, regridada para grade lat/lon com espaçamento de ~0,07° (~8 km). Projeção EPSG:4326 (WGS84).' },
  { q: 'Qual a resolução temporal?', a: 'Saídas 6-horárias (00Z, 06Z, 12Z, 18Z) para todo o período simulado de cada experimento.' },
  { q: 'Quantos experimentos estão disponíveis?', a: '4 experimentos: ERA5_atlas (reanálise), HIST (histórico WRF), SSP2-4.5 (cenário de emissões moderadas) e SSP5-8.5 (cenário de emissões elevadas).' },
  { q: 'Qual o tamanho total dos dados processados?', a: 'Aproximadamente 1,7 TB em arquivos NetCDF. Cada experimento ocupa entre ~80 GB e ~580 GB. Os GeoParquet têm ~17–19 MB cada e os COGs ~11 MB por experimento.' },
  { q: 'Quais variáveis estão disponíveis para visualização?', a: 'Velocidade do vento (ws) a 10 m e 100 m de altura; densidade de potência eólica (wpd). O perfil vertical cobre 5 altitudes: 10, 50, 100, 150 e 200 metros.' },
  { q: 'O que significam as faixas batimétricas?', a: 'Divisão da plataforma continental brasileira em 4 faixas de profundidade: 0–20 m (interna), 20–50 m (média), 50–100 m (externa) e a faixa unificada 0–100 m (plataforma total).' },
  { q: 'Qual a origem dos shapefiles de batimetria?', a: 'ZEE Brasileiro — Programa de Levantamento da Plataforma Continental (LEPLAC). Reprojetados para EPSG:4326 com codificação UTF-8.' },
  { q: 'Quantas UFs costeiras são cobertas?', a: '17 estados: AL, AP, BA, CE, ES, MA, PA, PB, PE, PI, PR, RJ, RN, RS, SC, SE, SP.' },
  { q: 'O que é o parâmetro de Weibull k (fator de forma)?', a: 'Descreve a dispersão da distribuição de velocidades do vento. k < 2 indica alta variabilidade; k entre 2 e 3 é típico de ventos costeiros; k > 3 indica ventos mais estáveis.' },
  { q: 'O que é o parâmetro de Weibull c (fator de escala)?', a: 'Proporcional à velocidade média do vento. Quanto maior c, maior a velocidade característica. A relação é: média = c · Γ(1 + 1/k), onde Γ é a função gama.' },
  { q: 'Como o Weibull é calculado?', a: 'Método dos Momentos: k = (σ / média)^(−1,086), c = média / Γ(1 + 1/k). Utiliza a média e o desvio padrão anuais da velocidade do vento.' },
  { q: 'O que é um COG (Cloud Optimized GeoTIFF)?', a: 'Formato de raster GeoTIFF otimizado para renderização progressiva via HTTP Range Requests. Permite carregar apenas os tiles visíveis no mapa sem baixar o arquivo inteiro.' },
  { q: 'Quantos COGs existem no total?', a: 'Aproximadamente 5.688 COGs, resultado de 4 experimentos × 2 variáveis × 2 alturas × 5 estações × (2 arquivos nacionais + 17 UFs × 4 faixas batimétricas = 70 estaduais). Cada COG tem entre 1 e 5 MB.' },
  { q: 'Os dados futuros consideram quais cenários?', a: 'SSP2-4.5 (cenário de mitigação moderada, forçamento radiativo de ~4,5 W/m²) e SSP5-8.5 (cenário de emissões elevadas, ~8,5 W/m²) do CMIP6, com downscaling dinâmico via WRF.' },
  { q: 'Qual o período dos dados históricos?', a: 'ERA5_atlas: 2004–2024 (21 anos). WRF Histórico (HIST): 2004–2014 (11 anos), forçado pela reanálise ERA5 com downscaling regional para ~9 km de resolução.' },
  { q: 'Qual o período das projeções futuras?', a: 'SSP2-4.5 e SSP5-8.5 cobrem 2015–2050, composto por duas janelas: 2015–2023 e 2030–2050. Dados 6-horários (00Z, 06Z, 12Z, 18Z) disponíveis para todos os anos simulados.' },
  { q: 'O GeoParquet contém séries temporais completas?', a: 'Não. O GeoParquet armazena apenas estatísticas agregadas (média, mínimo, máximo, desvio padrão) por estação (ANNUAL, DJF, MAM, JJA, SON) e parâmetros de Weibull. Para séries temporais completas é necessário consultar os arquivos NetCDF originais.' },
  { q: 'Como a consulta por pixel funciona no frontend?', a: 'O GeoParquet é carregado na memória via WebAssembly (parquet-wasm + Apache Arrow). Ao clicar no mapa, o frontend calcula a distância euclidiana até todos os pixels válidos e retorna o mais próximo em menos de 1 ms.' },
  { q: 'Como citar este projeto em publicações?', a: '"Cenário atual e futuro do recurso eólico offshore no Brasil" — Projeto apoiado pelo CNPq. [Inserir equipe e instituição]. Dados disponíveis em [repositório]. DOI: [a registrar].' },
]

export const PROJECT_INFO: ProjectInfo = {
  funding: {
    title: 'Cenário atual e futuro do recurso eólico offshore no Brasil',
    grantNumber: 'Chamada CNPq Nº 45/2024',
    description: 'Este projeto realiza o mapeamento do potencial eólico offshore brasileiro utilizando simulações climáticas regionais de alta resolução, considerando cenários atuais e futuros de mudanças climáticas.',
    acknowledgment: 'Agradecemos ao Conselho Nacional de Desenvolvimento Científico e Tecnológico (CNPq) pelo apoio financeiro.',
  },
  techSummary: [
    { label: 'Modelo', value: 'WRF (Weather Research and Forecasting)' },
    { label: 'Condições de contorno', value: 'ERA5 (ECMWF) para reanálise; CMIP6 SSP2-4.5 e SSP5-8.5 para projeções futuras' },
    { label: 'Resolução espacial', value: '534 × 263 pontos de grade (~140.442 células), modelo WRF ~9 km, grade lat/lon ~0,07° (~8 km)' },
    { label: 'Resolução temporal', value: '6-horária (00Z, 06Z, 12Z, 18Z)' },
    { label: 'Domínio', value: 'Costa brasileira — longitude ~55°W a ~25°W, latitude ~35°S a ~6°N' },
    { label: 'Variáveis', value: 'Velocidade do vento (ws) em 10 m e 100 m; densidade de potência eólica (wpd)' },
    { label: 'Alturas do perfil', value: '10 m, 50 m, 100 m, 150 m, 200 m' },
    { label: 'Formatos de saída', value: 'NetCDF (armazenamento bruto), COG (mapas base), GeoParquet (consultas analíticas)' },
    { label: 'Volume total', value: '~1,7 TB em arquivos NetCDF' },
    { label: 'Nº de experimentos', value: '4 (ERA5_atlas, HIST, SSP2-4.5, SSP5-8.5)' },
    { label: 'Períodos', value: 'ERA5_atlas: 2004–2024; WRF HIST: 2004–2014; SSP2-4.5/SSP5-8.5: 2015–2023 + 2030–2050' },
  ],
  team: 'Pesquisadores do [Laboratório/Instituição], Programa de Pós-Graduação em [Área], [Universidade].',
  publications: [
    'Downscaling de ventos offshore no litoral brasileiro usando WRF (em preparação)',
    'Impactos das mudanças climáticas no recurso eólico offshore do Brasil (em preparação)',
    'Conjunto de simulações WRF para avaliação do potencial eólico offshore brasileiro',
  ],
  contact: 'Para mais informações, colaborações ou solicitação de dados, entre em contato através do repositório do projeto.',
}
