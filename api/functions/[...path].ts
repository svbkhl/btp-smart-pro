// ============================================================================
// 🔄 PROXY VERCEL POUR SUPABASE EDGE FUNCTIONS
// ============================================================================
// Ce fichier crée un proxy qui redirige api.btpsmartpro.com/functions/*
// vers renmjmqlmafqjzldmsgs.supabase.co/functions/v1/*
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  // URL Supabase Edge Function
  const supabaseUrl = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/${pathString}`;
  
  console.log(`🔄 [Proxy] ${req.method} ${req.url} → ${supabaseUrl}`);
  
  try {
    // Copier les headers (sauf host et connection)
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== 'host' && 
        lowerKey !== 'connection' &&
        lowerKey !== 'content-length'
      ) {
        const value = req.headers[key];
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          headers[key] = value[0];
        }
      }
    });
    
    // Préparer le body si nécessaire
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' 
        ? req.body 
        : JSON.stringify(req.body);
    }
    
    // Faire la requête vers Supabase
    const response = await fetch(supabaseUrl, {
      method: req.method,
      headers: {
        ...headers,
        'host': 'renmjmqlmafqjzldmsgs.supabase.co',
      },
      body,
    });
    
    // Copier les headers de la réponse (sauf content-encoding pour éviter les problèmes)
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'content-encoding' && lowerKey !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    
    // Envoyer le statut et le body
    const data = await response.text();
    console.log(`✅ [Proxy] Response ${response.status} from ${supabaseUrl}`);
    
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error('❌ [Proxy] Error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error.message,
      url: supabaseUrl 
    });
  }
}
