# Dashboard Financeiro

Sistema completo de dashboard financeiro desenvolvido em React com TypeScript. Permite upload de planilhas CSV/XLSX e gera automaticamente relatórios financeiros com gráficos interativos e análises de DRE.

## 🚀 Funcionalidades

### 📊 Cards Principais (KPIs)
- **Receita Bruta**: Total de entradas
- **Custos**: Total de custos dos produtos/serviços  
- **Despesas**: Total de despesas operacionais
- **Lucro Bruto**: Receita - Custos
- **Lucro Líquido**: Lucro Bruto - Despesas
- **Margem Líquida**: Percentual de lucratividade

### 📈 Gráficos Interativos
- **Gráfico de Pizza**: Distribuição de custos e despesas por categoria
- **Gráfico de Linhas**: Evolução de receita e lucro ao longo do tempo
- **Gráfico de Barras**: Comparação entre receita, custos e despesas
- **Gauge/Medidor**: Margem líquida com indicadores visuais

### 📋 DRE (Demonstrativo de Resultados)
- Estrutura completa de DRE automatizada
- Cálculos dinâmicos baseados nos dados carregados
- Resumo financeiro com totais de entrada e saída

### 📅 Filtros de Período
- **Mensal**: Análise mês a mês
- **Trimestral**: Visão por trimestres
- **Anual**: Comparativo anual

### 📋 Tabela de Dados
- Visualização detalhada de todos os registros
- Ordenação por qualquer coluna
- Paginação para grandes volumes de dados
- Status com cores (Pago/Pendente/Atrasado)
- Categorização por tipo (Receita/Custo/Despesa)

### 🌙 Dark/Light Mode
- Tema escuro por padrão
- Alternância para tema claro
- Interface responsiva para mobile

## 📋 Formato da Planilha

### Colunas Obrigatórias:
| Coluna | Descrição | Valores Aceitos |
|--------|-----------|-----------------|
| Tipo | Tipo da transação | Receita, Custo, Despesa |
| Status | Status do pagamento | Pago, Pendente, Atrasado |
| Data efetiva | Data da transação | DD/MM/AAAA ou AAAA-MM-DD |
| Valor efetivo | Valor em R$ | Números (com ou sem formato) |
| Descrição | Descrição da transação | Texto livre |
| Categoria | Categoria da transação | Texto livre |
| Conta | Conta utilizada | Texto livre |
| Contato | Nome do contato/cliente | Texto livre |
| CPF/CNPJ | Documento | Texto livre |
| Razão social | Nome da empresa | Texto livre |
| Forma | Forma de pagamento | Texto livre |
| Observações | Observações adicionais | Texto livre |
| Data de criação | Data de criação do registro | DD/MM/AAAA ou AAAA-MM-DD |

### Exemplo de Arquivo CSV:
```csv
Tipo,Status,Data efetiva,Valor efetivo,Descrição,Categoria,Conta,Contato,CPF/CNPJ,Razão social,Forma,Observações,Data de criação
Receita,Pago,15/01/2024,50000,Venda de produtos,Vendas,Caixa,Cliente A,12345678901,Empresa A Ltda,Dinheiro,,15/01/2024
Custo,Pago,10/01/2024,20000,Compra de matéria-prima,Matéria Prima,Fornecedor,Fornecedor X,11122233344,Fornecedor X Ltda,Boleto,,10/01/2024
Despesa,Pago,05/01/2024,8000,Aluguel do escritório,Aluguel,Banco,Imobiliária,99988877766,Imobiliária Z,Transferência,,05/01/2024
```

## ⚙️ Instalação e Execução

### Pré-requisitos:
- Node.js (versão 16 ou superior)
- npm ou yarn

### Passos:
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npm start

# 3. Abrir no navegador
# http://localhost:3000
```

### Build para Produção:
```bash
npm run build
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── Cards/
│   │   ├── KPICard.tsx          # Card individual de KPI
│   │   └── KPICards.tsx         # Grid de cards
│   ├── Charts/
│   │   ├── PieChart.tsx         # Gráfico de pizza
│   │   ├── LineChart.tsx        # Gráfico de linha
│   │   ├── BarChart.tsx         # Gráfico de barras
│   │   └── GaugeChart.tsx       # Medidor/Gauge
│   ├── Table/
│   │   └── DataTable.tsx        # Tabela de dados
│   ├── FileUpload.tsx           # Upload de arquivos
│   └── DRE.tsx                  # Demonstrativo de Resultados
├── services/
│   └── dataService.ts           # Processamento de dados
├── types/
│   └── index.ts                 # Definições de tipos
├── App.tsx                      # Componente principal
├── index.tsx                    # Entrada da aplicação
└── index.css                    # Estilos globais
```

## 📱 Responsividade

O dashboard foi desenvolvido com design responsivo:
- **Desktop**: Layout completo com grid de 2x3 cards
- **Tablet**: Grid adaptado com 2 colunas
- **Mobile**: Layout de coluna única
- **Componentes otimizados**: Todos os gráficos e tabelas se adaptam ao tamanho da tela

## 🎨 Temas

### Dark Mode (Padrão):
- Fundo escuro (#0f172a)
- Cards em tons de cinza escuro
- Bordas destacadas por cor por tipo de KPI

### Light Mode:
- Fundo claro (#f8fafc) 
- Cards em branco
- Contrastes otimizados para legibilidade

## 🔧 Tecnologias Utilizadas

- **React 18**: Framework principal
- **TypeScript**: Tipagem estática
- **Recharts**: Gráficos interativos
- **XLSX**: Leitura de arquivos Excel
- **Papaparse**: Processamento de CSV
- **CSS3**: Estilização responsiva

## 📊 Cálculos Financeiros

### Fórmulas Aplicadas:
- **Receita Bruta** = Soma de todos os registros do tipo "Receita"
- **Custos** = Soma de todos os registros do tipo "Custo" 
- **Despesas** = Soma de todos os registros do tipo "Despesa"
- **Lucro Bruto** = Receita Bruta - Custos
- **Lucro Líquido** = Lucro Bruto - Despesas
- **Margem Líquida** = (Lucro Líquido ÷ Receita Bruta) × 100

### Comparativo Mensal:
- Variação percentual calculada automaticamente
- Base de comparação: mês anterior
- Indicadores visuais: ↗️ (crescimento), ↘️ (queda), ➡️ (estável)

## 🎯 Recursos Avançados

### Processamento Inteligente:
- **Datas**: Aceita múltiplos formatos (DD/MM/AAAA, AAAA-MM-DD)
- **Valores**: Remove formatação automaticamente (R$, pontos, vírgulas)
- **Validação**: Verifica tipos obrigatórios e valores válidos
- **Limpeza**: Remove registros com valores zerados

### Performance:
- **useMemo**: Cálculos otimizados que só reexecutam quando necessário
- **Paginação**: Tabela com 20 registros por página
- **Lazy Loading**: Componentes carregados sob demanda

## 🚀 Deploy

### Netlify/Vercel:
```bash
npm run build
# Upload da pasta 'build' para o serviço de hospedagem
```

### Servidor próprio:
```bash
npm install -g serve
npm run build
serve -s build -l 3000
```

## 📈 Exemplo de Uso

1. **Carregue uma planilha** CSV ou XLSX seguindo o formato especificado
2. **Visualize os KPIs** automaticamente calculados nos 6 cards principais  
3. **Analise o DRE** gerado dinamicamente
4. **Explore os gráficos** para insights visuais
5. **Filtre por período** para análises específicas
6. **Consulte a tabela** para dados detalhados
7. **Alterne entre temas** claro e escuro conforme preferência

## 🎖️ Características do Sistema

✅ **Completo**: Todas as funcionalidades solicitadas implementadas  
✅ **Responsivo**: Funciona perfeitamente em mobile, tablet e desktop  
✅ **Performático**: Otimizado para grandes volumes de dados  
✅ **Intuitivo**: Interface limpa e fácil de usar  
✅ **Robusto**: Tratamento de erros e validações consistentes  
✅ **Moderno**: Tecnologias atuais e melhores práticas  

---

**Desenvolvido com ❤️ usando React + TypeScript**