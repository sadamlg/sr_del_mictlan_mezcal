const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const unavailable = {
  error: { code: 'VISITS_UNAVAILABLE', message: 'El contador no está disponible por ahora.' },
};

export function createVisitsHandlers({ countVisits, registerVisit }) {
  return {
    async get(_request, response) {
      response.set('Cache-Control', 'no-store');
      try {
        return response.status(200).json({ count: await countVisits() });
      } catch {
        return response.status(503).json(unavailable);
      }
    },
    async post(request, response) {
      response.set('Cache-Control', 'no-store');
      const body = request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body) ||
          Object.keys(body).length !== 1 || typeof body.visitId !== 'string' || !UUID_V4.test(body.visitId)) {
        return response.status(400).json({ error: { code: 'INVALID_VISIT_ID', message: 'Identificador de visita inválido.' } });
      }
      try {
        return response.status(200).json({ count: await registerVisit(body.visitId.toLowerCase()) });
      } catch {
        return response.status(503).json(unavailable);
      }
    },
  };
}
