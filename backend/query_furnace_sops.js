const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { DocumentsService } = require('./dist/documents/documents.service');

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const docsService = app.get(DocumentsService);
  const docRepo = docsService.documentRepository;
  
  const allDocs = await docRepo.find();
  console.log(`TOTAL DOCUMENTS: ${allDocs.length}`);
  
  const furnaceDocs = allDocs.filter(d => {
    return d.departments && d.departments.some(dept => dept.toLowerCase().includes('furnace'));
  });
  
  console.log('\n--- FURNACE DOCUMENTS ---');
  furnaceDocs.forEach(d => {
    console.log(`Title: ${d.title} | Number: ${d.documentNumber} | Type: ${d.type} | Departments: ${d.departments ? d.departments.join(', ') : 'null'} | Status: ${d.status}`);
  });
  
  console.log('\n--- ALL DOCUMENT TYPES AND DEPARTMENTS ---');
  allDocs.forEach(d => {
    console.log(`Title: ${d.title} | Number: ${d.documentNumber} | Type: ${d.type} | Departments: ${d.departments ? d.departments.join(', ') : 'null'} | Status: ${d.status}`);
  });

  await app.close();
}

run();
