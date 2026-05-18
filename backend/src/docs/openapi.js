export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Escala GRU API',
    version: '1.0.0',
    description:
      'API do sistema de gerenciamento de plantoes aeroportuarios (GRU). ' +
      'A escala e importada de uma planilha Excel em formato matriz (pessoa x dia).',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Token JWT + usuario' }, 401: { description: 'Credenciais invalidas' } },
      },
    },
    '/auth/me': { get: { tags: ['Auth'], responses: { 200: { description: 'Usuario atual' } } } },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: { 200: { description: 'Resumo do dia' } },
      },
    },
    '/shifts': {
      get: {
        tags: ['Escala'],
        parameters: [
          { name: 'person', in: 'query', schema: { type: 'string' } },
          { name: 'team', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'monthSheet', in: 'query', schema: { type: 'string' } },
          { name: 'shiftCode', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Lista de atribuicoes' } },
      },
      post: { tags: ['Escala'], responses: { 201: { description: 'Criado' } } },
    },
    '/shifts/{id}': {
      put: { tags: ['Escala'], responses: { 200: { description: 'Atualizado' } } },
      delete: { tags: ['Escala'], responses: { 200: { description: 'Removido' } } },
    },
    '/shifts/meta': { get: { tags: ['Escala'], responses: { 200: { description: 'Equipes/tipos/pessoas' } } } },
    '/import/excel': { post: { tags: ['Importacao'], responses: { 200: { description: 'Importacao executada' } } } },
    '/import/files': { get: { tags: ['Importacao'], responses: { 200: { description: 'Arquivos na pasta' } } } },
    '/logs/sync': { get: { tags: ['Logs'], responses: { 200: { description: 'Logs de sincronizacao' } } } },
    '/logs/audit': { get: { tags: ['Logs'], responses: { 200: { description: 'Logs de auditoria' } } } },
    '/users': {
      get: { tags: ['Usuarios'], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Usuarios'], responses: { 201: { description: 'Criado' } } },
    },
    '/dashboard/backups': { get: { tags: ['Backup'], responses: { 200: { description: 'Lista de backups' } } } },
  },
};

export default openapiSpec;
