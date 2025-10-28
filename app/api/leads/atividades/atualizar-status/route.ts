
import { NextResponse } from 'next/server';
import axios from 'axios';

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_SAVE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

let cachedToken: string | null = null;

async function obterToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  const resposta = await axios.post(ENDPOINT_LOGIN, {}, {
    headers: LOGIN_HEADERS,
    timeout: 10000
  });

  const token = resposta.data.bearerToken || resposta.data.token;
  if (!token) {
    throw new Error("Token não encontrado na resposta de login.");
  }

  cachedToken = token;
  return token;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { CODATIVIDADE, STATUS } = body;

    if (!CODATIVIDADE || !STATUS) {
      return NextResponse.json(
        { error: 'CODATIVIDADE e STATUS são obrigatórios' },
        { status: 400 }
      );
    }

    const token = await obterToken();

    const PAYLOAD = {
      "serviceName": "DatasetSP.save",
      "requestBody": {
        "entityName": "AD_ADLEADSATIVIDADES",
        "standAlone": false,
        "fields": ["STATUS"],
        "records": [{
          "pk": { CODATIVIDADE: String(CODATIVIDADE) },
          "values": {
            "0": STATUS
          }
        }]
      }
    };

    await axios.post(URL_SAVE_SERVICO, PAYLOAD, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}
