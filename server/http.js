export class HttpError extends Error { constructor(status, code) { super(code); this.status=status; this.code=code; } }
export const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const safeError=error=>json({error:error instanceof HttpError?error.code:'SERVER_ERROR'},error instanceof HttpError?error.status:500);
