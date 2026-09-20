# Precifica 3D

Sistema de precificacao, catalogo de produtos, gestao de pedidos e analise financeira para pecas impressas em 3D. Projetado para execucao local direta (Windows via script em lote) ou conteinerizada (Docker, Docker Compose, ZimaOS e ambientes Homelab).

## Visao Geral

O Precifica 3D resolve o calculo de custos diretos e indiretos da manufatura aditiva sem dependencia de servicos externos ou assinaturas em nuvem. A analise de arquivos, extracao de parametros de fatiamento e persistencia de dados ocorrem de forma local.

### Principais Recursos

- Calculadora de Custos: processamento direto de arquivos STL, OBJ, G-code e 3MF com estimativa volumetrica, extracao automatica de peso e tempo de impressao por placa.
- Modos de Producao Estruturados: suporte nativo para producao em lote simples (Quantidade), produtos montados (Multiparte) e arranjos complexos (Avancado).
- Motor de Precificacao Parametrico: calculo dinamico de custo de filamento (multi-material), depreciacao por hora de maquina, consumo de energia por potencia/regiao, mao de obra/montagem, margem de falha, taxas de plataforma, impostos e markup ajustavel de 1.0x a 10.0x.
- Visualizador 3D Integrado: renderizador WebGL interativo em Three.js para inspecao de geometria antes da confirmacao de orcamentos.
- Gestao de Pedidos em Kanban: fluxo visual em quatro estagios (Proposta, Fila, Em Producao e Finalizado) com movimentacao drag-and-drop e geracao de orcamentos em PDF/WhatsApp.
- Painel Financeiro: metricas de receita bruta, margem liquida real, ticket medio, composicao de custos e demonstrativo de resultados.
- Modo Cliente: alternador na barra lateral que oculta margens e custos internos de producao para exibicao direta em balcao ou vitrine.
- Persistencia Local Autocontida: banco de dados SQLite operando em modo Write-Ahead Logging (WAL) nativo no Node.js.

---

## Modos de Producao e Motor de Calculo

A calculadora oferece tres modelos de calculo para atender desde itens simples ate montagens complexas:

### 1. Modo Quantidade (Varias copias do mesmo item)
Utilizado quando uma placa imprime multiplas unidades identicas de uma so vez (exemplo: 10 chaveiros na mesma mesa de impressao).
- O custo de impressao da placa e dividido pelo numero de copias presentes na mesa, diluindo o custo unitario.
- Parametro "Produz varias unidades?": quantidade de pecas impressas simultaneamente por rodada de mesa.
- Parametro "Imprimir mais de uma vez?": quantidade de ciclos/rodadas de impressao executadas.
- Formula:
  - Custo Base da Rodada = Material (com margem de falha) + Energia + Depreciacao da Maquina
  - Custo Total do Lote = Custo Base da Rodada * Rodadas de Impressao
  - Total de Unidades Produzidas = Rodadas de Impressao * Unidades por Mesa
  - Custo Unitario de Fabricacao = Custo Total do Lote / Total de Unidades Produzidas

### 2. Modo Multiparte (Produto montado de partes)
Utilizado quando um unico produto e composto por varias placas distintas (exemplo: caixa composta por base, tampa e trava).
- O sistema soma os custos de todas as placas necessarias para compor uma unidade final montada.
- Parametro "Imprimir mais de uma vez?": quantas rodadas de impressao daquela placa especifica o kit exige (exemplo: se o produto precisa de 10 travas e cabem apenas 5 na mesa, sao necessarias 2 rodadas da placa de trava para compor 1 produto).
- Formula:
  - Custo de Fabricacao do Produto = Soma de (Custo da Placa * Rodadas Necessarias da Placa)
  - Unidades Finais = 1 produto montado

### 3. Modo Avancado (Controle Total)
Indicado para arranjos fabris hibridos onde multiplas placas produzem quantidades desiguais de pecas que formam kits com proporcoes variaveis.
- Permite configurar individualmente:
  - Rodadas da placa (Imprimir mais de uma vez)
  - Unidades produzidas por rodada
  - Partes necessarias por produto montado
- Formula:
  - Partes Produzidas por Placa = Rodadas * Unidades por Rodada
  - Produtos Completos Possiveis por Placa = floor(Partes Produzidas / Partes por Produto)
  - Unidades Finais do Lote = Menor valor entre todas as placas componentes
  - Custo Unitario = Custo Total do Lote / Unidades Finais

---

## Arquitetura do Sistema

- Backend: Node.js (ES Modules) com Express.
- Banco de Dados: SQLite nativo com WAL mode.
- Armazenamento de Arquivos: local em diretorio de uploads configuravel.
- Frontend: Single Page Application com Vite, React 19 e Three.js.
- Interface: Dark Mode com paleta grafite, ciano e esmeralda.
- Porta Padrao: 5172.

---

## Como Executar

### 1. Execucao Direta no Windows (via script .bat)

Execute o arquivo `iniciar.bat` localizado na raiz do projeto. O script realiza os seguintes passos:
1. Verifica a instalacao do Node.js v20+.
2. Instala dependencias pendentes automaticamente.
3. Compila o frontend em bundle de producao caso necessario.
4. Inicia o servidor na porta 5172 e abre o navegador em `http://localhost:5172`.

### 2. Execucao via Docker Compose

Para execucao conteinerizada:

```bash
docker compose up -d --build
```

Acesse no navegador:
```
http://localhost:5172
```

Para visualizar os registros de execucao:
```bash
docker compose logs -f
```

### 3. Deploy em Homelab / ZimaOS / CasaOS

No ZimaOS ou CasaOS, utilize o caminho `/DATA/AppData/precifica-3d` para persistencia:

```yaml
services:
  precifica-3d:
    image: precifica-3d:latest
    build: .
    container_name: precifica-3d
    restart: unless-stopped
    ports:
      - "5172:5172"
    environment:
      - PORT=5172
      - HOST=0.0.0.0
      - DATA_DIR=/app/data
      - NODE_ENV=production
    volumes:
      - /DATA/AppData/precifica-3d:/app/data
```

### 4. Modo de Desenvolvimento

Para execucao com recarregamento a quente (HMR):

```bash
# Terminal 1 - Backend API na porta 5172:
npm run dev:server

# Terminal 2 - Vite Dev Server na porta 5173 com proxy reverso:
npm run dev:client
```

---

## Estrutura de Diretorios

```
precifica-3d/
├── client/                     # Frontend em React 19 + Vite
│   ├── src/
│   │   ├── api/                # Comunicacao com a API REST
│   │   ├── components/         # Componentes visuais, modais e visualizador 3D
│   │   ├── pages/              # Calculadora, Catalogo, Pedidos, Financeiro e Configuracoes
│   │   └── utils/              # Formatadores de moeda, tempo e peso
│   └── vite.config.js          # Configuracao do Vite e proxy
├── server/                     # Backend Node.js
│   ├── src/
│   │   ├── config.js           # Configuracoes de ambiente e caminhos
│   │   ├── db/                 # Conexao SQLite e migracoes
│   │   ├── middleware/         # Autenticacao e manipulacao de uploads
│   │   ├── routes/             # Rotas RESTful da aplicacao
│   │   └── services/           # Analisador 3D, parser G-code e motor de precificacao
├── data/                       # Volume persistente (SQLite e uploads)
├── Dockerfile                  # Construcao multi-stage
├── docker-compose.yml          # Configuracao do container
├── iniciar.bat                 # Inicializador para Windows
└── README.md                   # Documentacao tecnica
```

---

## Credenciais Padrao

No primeiro acesso, utilize:
- E-mail: `admin@precifica3d.local`
- Senha: `admin123`

---

## Licenca

Distribuido sob a licenca MIT.
