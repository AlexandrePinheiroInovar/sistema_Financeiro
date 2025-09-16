import React, { useState } from 'react';
import { DataService } from '../services/dataService';
import { FinancialRecord } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: FinancialRecord[]) => void;
  userRole?: 'admin' | 'user' | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, userRole }) => {
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

  const isAdmin = userRole === 'admin';

  return (
    <div
      className={`upload-section ${dragActive && isAdmin ? 'drag-active' : ''}`}
      onDragEnter={isAdmin ? handleDrag : undefined}
      onDragLeave={isAdmin ? handleDrag : undefined}
      onDragOver={isAdmin ? handleDrag : undefined}
      onDrop={isAdmin ? handleDrop : undefined}
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
            <h3>
              {isAdmin ? 'Carregue sua planilha financeira' : 'Área de Upload de Planilhas'}
            </h3>
            <p>
              {isAdmin
                ? 'Arraste e solte um arquivo CSV ou XLSX aqui, ou clique para selecionar'
                : 'Instruções para preparação de planilhas financeiras'
              }
            </p>

            {/* Botão de upload - apenas para administradores */}
            {isAdmin && (
              <>
                <input
                  type="file"
                  id="file-input"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                />

                <label htmlFor="file-input" className="upload-button">
                  Selecionar Arquivo
                </label>
              </>
            )}

            {/* Aviso para usuários não-admin */}
            {!isAdmin && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px',
                margin: '16px 0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
                <p style={{
                  margin: 0,
                  fontWeight: '600',
                  color: '#92400e'
                }}>
                  Upload restrito a Administradores
                </p>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: '#92400e'
                }}>
                  Entre em contato com um administrador para fazer upload de planilhas
                </p>
              </div>
            )}

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
                  {isAdmin && <li><strong>Arraste e solte</strong> o arquivo na área acima</li>}
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