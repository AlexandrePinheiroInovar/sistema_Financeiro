import React, { useState } from 'react';
import { DataService } from '../services/dataService';
import { FinancialRecord } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: FinancialRecord[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.some(type => file.type === type) && 
        !['csv', 'xlsx', 'xls'].some(ext => file.name.toLowerCase().endsWith(`.${ext}`))) {
      setError('Formato de arquivo não suportado. Use CSV ou XLSX.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await DataService.parseFile(file);
      
      if (data.length === 0) {
        setError('Nenhum registro válido encontrado no arquivo.');
        return;
      }

      onDataLoaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`upload-section ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="upload-content">
        <div className="upload-icon">
          📊
        </div>
        
        {loading ? (
          <div className="loading">
            <div>Processando arquivo...</div>
          </div>
        ) : (
          <>
            <h3>Carregue sua planilha financeira</h3>
            <p>Arraste e solte um arquivo CSV ou XLSX aqui, ou clique para selecionar</p>
            
            <input
              type="file"
              id="file-input"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
            />
            
            <label htmlFor="file-input" className="upload-button">
              Selecionar Arquivo
            </label>

            <div className="file-requirements">
              <div className="required-columns">
                <p><strong>Colunas obrigatórias:</strong></p>
                <ul>
                  <li>Tipo (Receita, Custo, Despesa)</li>
                  <li>Status (Pago, Pendente, Atrasado)</li>
                  <li>Data efetiva</li>
                  <li>Valor efetivo</li>
                  <li>Descrição</li>
                  <li>Categoria</li>
                </ul>
              </div>
              
              <div className="upload-tips">
                <p><strong>💡 Dicas importantes:</strong></p>
                <ul>
                  <li>Use planilhas simples (evite tabelas dinâmicas)</li>
                  <li>Primeira linha deve ser o cabeçalho</li>
                  <li>Remova linhas vazias ou de totais</li>
                  <li>Cada linha = um registro financeiro</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="error-message">
            <strong>Erro:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};