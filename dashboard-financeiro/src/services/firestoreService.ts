import { db, auth } from '../firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { FinancialRecord } from '../types';

export class FirestoreService {
  private static readonly COLLECTION_NAME = 'financial_records';

  // Salvar múltiplos registros financeiros usando batch writes
  static async saveRecords(records: FinancialRecord[], userId?: string): Promise<void> {
    try {
      console.log(`🔥 Salvando ${records.length} registros no Firestore...`);

      // Primeiro, limpar registros existentes do usuário
      await this.clearUserRecords(userId);

      if (records.length === 0) {
        console.log('✅ Nenhum registro para salvar');
        return;
      }

      // Usar batch writes com delay para evitar quota exceeded (máximo 500 por batch)
      const batchSize = 400; // Reduzir para evitar quota
      const delayBetweenBatches = 1000; // 1 segundo entre batches
      let totalSaved = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchRecords = records.slice(i, i + batchSize);
        const batchNumber = Math.floor(i/batchSize) + 1;

        console.log(`💾 Salvando batch ${batchNumber} com ${batchRecords.length} registros...`);

        batchRecords.forEach(record => {
          const recordWithMetadata = {
            ...record,
            userId: userId || 'anonymous',
            uploadedAt: Timestamp.now(),
            createdAt: Timestamp.now()
          };

          // Criar uma nova referência para cada documento
          const docRef = doc(collection(db, this.COLLECTION_NAME));
          batch.set(docRef, recordWithMetadata);
        });

        try {
          await batch.commit();
          totalSaved += batchRecords.length;
          console.log(`✅ Batch ${batchNumber} salvo com sucesso (${totalSaved}/${records.length})`);

          // Delay entre batches para evitar quota exceeded
          if (i + batchSize < records.length) {
            console.log(`⏳ Aguardando ${delayBetweenBatches}ms antes do próximo batch...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        } catch (error: any) {
          if (error.code === 'resource-exhausted') {
            console.log(`⚠️ Quota excedida no batch ${batchNumber}, aguardando 5 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Tentar novamente
            await batch.commit();
            totalSaved += batchRecords.length;
            console.log(`✅ Batch ${batchNumber} salvo após retry (${totalSaved}/${records.length})`);
          } else {
            throw error;
          }
        }
      }

      console.log(`✅ Todos os ${totalSaved} registros foram salvos com sucesso no Firestore`);
    } catch (error) {
      console.error('❌ Erro ao salvar registros no Firestore:', error);
      throw new Error('Falha ao salvar dados no banco. Verifique sua conexão.');
    }
  }

  // Carregar registros financeiros do usuário
  static async loadRecords(userId?: string): Promise<FinancialRecord[]> {
    try {
      console.log('🔥 Carregando registros do Firestore...');
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const records: FinancialRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filtrar por usuário se especificado
        if (!userId || data.userId === userId || data.userId === 'anonymous') {
          // Remover metadados do Firebase antes de retornar
          const { userId: _, uploadedAt, createdAt, ...financialRecord } = data;
          records.push(financialRecord as FinancialRecord);
        }
      });
      
      console.log(`✅ ${records.length} registros carregados do Firestore`);
      return records;
    } catch (error) {
      console.error('❌ Erro ao carregar registros do Firestore:', error);
      // Retornar array vazio em caso de erro para não quebrar a aplicação
      return [];
    }
  }

  // Limpar registros do usuário usando batch delete (mais eficiente)
  static async clearUserRecords(userId?: string): Promise<void> {
    try {
      console.log('🗑️ Limpando registros anteriores para usuário:', userId || 'anonymous');

      const q = query(collection(db, this.COLLECTION_NAME));
      console.log('📋 Buscando documentos para deletar...');
      const querySnapshot = await getDocs(q);
      console.log(`📄 Encontrados ${querySnapshot.size} documentos para verificar`);

      const docsToDelete: string[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        // Deletar registros do usuário ou anônimos
        if (!userId || data.userId === userId || data.userId === 'anonymous') {
          docsToDelete.push(docSnapshot.id);
        }
      });

      console.log(`🗑️ ${docsToDelete.length} documentos serão deletados`);

      if (docsToDelete.length === 0) {
        console.log('✅ Nenhum documento para deletar');
        return;
      }

      // Usar batch delete para melhor performance (máximo 500 por batch)
      const batchSize = 500;
      for (let i = 0; i < docsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = docsToDelete.slice(i, i + batchSize);

        console.log(`⏳ Deletando batch ${Math.floor(i/batchSize) + 1} com ${batchDocs.length} documentos...`);

        batchDocs.forEach(docId => {
          batch.delete(doc(db, this.COLLECTION_NAME, docId));
        });

        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} deletado com sucesso`);
      }

      console.log(`✅ Todos os ${docsToDelete.length} registros foram removidos com sucesso`);
    } catch (error: any) {
      console.error('❌ Erro ao limpar registros:', error);
      console.error('❌ Código do erro:', error.code);
      console.error('❌ Mensagem do erro:', error.message);
      throw new Error(`Falha ao apagar dados: ${error.message}`);
    }
  }

  // Verificar conexão com Firestore
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testando conexão com Firestore...');
      console.log('👤 Usuário autenticado:', auth.currentUser?.email || 'Nenhum');
      
      const testQuery = query(collection(db, this.COLLECTION_NAME));
      await getDocs(testQuery);
      console.log('✅ Conexão com Firestore estabelecida');
      return true;
    } catch (error: any) {
      console.error('❌ Falha na conexão com Firestore:', error);
      
      if (error.code === 'permission-denied') {
        console.error('🚫 Erro de permissão - verifique as regras do Firestore');
        console.error('💡 Sugestão: Configure regras mais permissivas ou autentique o usuário');
      } else if (error.code === 'unavailable') {
        console.error('🌐 Firestore indisponível - verifique a conexão de internet');
      }
      
      return false;
    }
  }
}