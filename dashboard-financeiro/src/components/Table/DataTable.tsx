import React, { useState, useMemo } from 'react';
import { FinancialRecord } from '../../types';
import { DataService } from '../../services/dataService';

interface DataTableProps {
  records: FinancialRecord[];
}

export const DataTable: React.FC<DataTableProps> = ({ records }) => {
  const [sortField, setSortField] = useState<keyof FinancialRecord>('dataEfetiva');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'valorEfetivo') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortField === 'dataEfetiva') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortDirection]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRecords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(records.length / itemsPerPage);

  const handleSort = (field: keyof FinancialRecord) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pago':
        return 'status-pago';
      case 'pendente':
        return 'status-pendente';
      case 'atrasado':
        return 'status-atrasado';
      default:
        return 'status-pendente';
    }
  };

  const getSortIcon = (field: keyof FinancialRecord) => {
    if (field !== sortField) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (records.length === 0) {
    return (
      <div className="table-container">
        <div className="no-data">
          <h3>Nenhum registro encontrado</h3>
          <p>Carregue uma planilha para visualizar os dados financeiros</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-header">
        <h3>Registros Financeiros ({records.length} itens)</h3>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => handleSort('tipo')} className="sortable">
                Tipo {getSortIcon('tipo')}
              </th>
              <th onClick={() => handleSort('descricao')} className="sortable">
                Descrição {getSortIcon('descricao')}
              </th>
              <th onClick={() => handleSort('valorEfetivo')} className="sortable">
                Valor {getSortIcon('valorEfetivo')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {getSortIcon('status')}
              </th>
              <th onClick={() => handleSort('dataEfetiva')} className="sortable">
                Data {getSortIcon('dataEfetiva')}
              </th>
              <th onClick={() => handleSort('categoria')} className="sortable">
                Categoria {getSortIcon('categoria')}
              </th>
              <th onClick={() => handleSort('conta')} className="sortable">
                Conta {getSortIcon('conta')}
              </th>
              <th onClick={() => handleSort('contato')} className="sortable">
                Contato {getSortIcon('contato')}
              </th>
              <th onClick={() => handleSort('razaoSocial')} className="sortable">
                Razão Social {getSortIcon('razaoSocial')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.map((record, index) => (
              <tr key={index}>
                <td>
                  <span className={`type-badge type-${record.tipo.toLowerCase()}`}>
                    {record.tipo}
                  </span>
                </td>
                <td title={record.descricao}>
                  {record.descricao.length > 50 
                    ? `${record.descricao.substring(0, 50)}...` 
                    : record.descricao
                  }
                </td>
                <td className={record.tipo === 'Receita' ? 'positive' : 'negative'}>
                  {DataService.formatCurrency(record.valorEfetivo)}
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td>{formatDate(record.dataEfetiva)}</td>
                <td>{record.categoria}</td>
                <td>{record.conta}</td>
                <td>{record.contato}</td>
                <td title={record.razaoSocial}>
                  {record.razaoSocial.length > 30 
                    ? `${record.razaoSocial.substring(0, 30)}...` 
                    : record.razaoSocial
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ← Anterior
          </button>
          
          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
};