# AbastFLow (Vue 3 + Vite + Tailwind + Supabase)

## Setup
1) `npm i`
2) Copia `.env.example` a `.env` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3) `npm run dev` → http://localhost:5173

## Deploy (Vercel)
- Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Project → Settings → Environment Variables.
- Build: `npm run build` — Output: `dist/`
- `vercel.json` ya configura SPA rewrites.

## Reporte de Requerimientos
- Consulta RPC: `get_requerimientos_proveedor(p_vendor text default null)`
- Grid ordenable, paginado en cliente, exportación CSV.
