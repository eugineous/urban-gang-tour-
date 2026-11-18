/** Read at the request boundary, never freeze a deployment flag at module import. */
export function urbanNewsEnabled():boolean{return process.env.URBAN_NEWS_ENABLED==='true'}
