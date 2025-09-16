import React, { useState } from 'react';
import { CategoryFilter } from './CategoryFilter';

export const CategoryFilterExample: React.FC = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    "1.1.1 Locação de Veículos",
    "1.1.2 Emplacamento",
    "1.1.3 Taxa de Retirada",
    "1.2.1 Combustível",
    "1.2.2 Manutenção",
    "1.2.3 Seguro",
    "2.1.1 Salários",
    "2.1.2 Benefícios",
    "2.2.1 Marketing",
    "2.2.2 Publicidade",
    "3.1.1 Impostos Federais",
    "3.1.2 Impostos Estaduais",
    "3.1.3 Impostos Municipais"
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '400px' }}>
      <h3 style={{ marginBottom: '16px', color: '#e2e8f0' }}>
        Exemplo de CategoryFilter
      </h3>
      
      <CategoryFilter
        options={categories}
        selected={selectedCategories}
        onChange={setSelectedCategories}
      />
      
      <div style={{ marginTop: '20px', padding: '16px', background: '#1e293b', borderRadius: '8px' }}>
        <h4 style={{ color: '#e2e8f0', marginBottom: '12px' }}>Categorias Selecionadas:</h4>
        {selectedCategories.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma categoria selecionada</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0' }}>
            {selectedCategories.map(category => (
              <li key={category} style={{ marginBottom: '4px' }}>{category}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};