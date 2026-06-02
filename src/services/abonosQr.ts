import api from './api';

export interface AbonoQrMatchInfo {
  id: number;
  opponent: string;
  kickoff_at: string;
  label: string;
}

export interface AbonoQrResponse {
  qrDataUri: string;
  token: string;
  match: AbonoQrMatchInfo;
  expiresAt: string;
  customerName?: string;
  zone?: string;
  asiento?: string;
}

interface RawAbonoQrResponse {
  qr_data_uri: string;
  token: string;
  match: AbonoQrMatchInfo;
  expires_at: string;
  customer_name?: string;
  zone?: string;
  asiento?: string;
}

/**
 * Pide al backend el QR del abono para un partido concreto (o el próximo
 * partido de local si no se pasa matchId).
 * Endpoint: GET /api/me/abonos/{ticketId}/qr?match=ID
 */
export async function fetchAbonoMatchQr(
  ticketId: number,
  matchId?: number
): Promise<AbonoQrResponse> {
  const params: Record<string, string | number> = {};
  if (matchId != null) params.match = matchId;
  const { data } = await api.get<RawAbonoQrResponse>(
    `/api/me/abonos/${ticketId}/qr`,
    { params }
  );
  return {
    qrDataUri: data.qr_data_uri,
    token: data.token,
    match: data.match,
    expiresAt: data.expires_at,
    customerName: data.customer_name,
    zone: data.zone,
    asiento: data.asiento,
  };
}
