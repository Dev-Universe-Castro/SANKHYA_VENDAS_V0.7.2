
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

const formatarDataHoraParaSankhya = (dataHoraISO: string) => {
  if (!dataHoraISO) return "";
  try {
    const date = new Date(dataHoraISO);
    
    // Usar data local para evitar problemas de fuso horário
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const seg = String(date.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
  } catch (e) {
    return "";
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { CODATIVIDADE, DATA_INICIO, DATA_FIM, ATIVO, TITULO, DESCRICAO, TIPO, COR } = body;

    if (!CODATIVIDADE) {
      return NextResponse.json(
        { error: 'CODATIVIDADE é obrigatório' },
        { status: 400 }
      );
    }

    const token = await obterToken();

    const fields = [];
    const values: any = {};
    let index = 0;

    if (TITULO !== undefined) {
      fields.push("DESCRICAO");
      // Combinar TITULO e DESCRICAO no formato esperado
      const descricaoCompleta = DESCRICAO !== undefined 
        ? `${TITULO}|${DESCRICAO}` 
        : TITULO;
      values[String(index)] = descricaoCompleta;
      index++;
    } else if (DESCRICAO !== undefined) {
      fields.push("DESCRICAO");
      values[String(index)] = DESCRICAO;
      index++;
    }

    if (TIPO !== undefined) {
      fields.push("TIPO");
      values[String(index)] = TIPO;
      index++;
    }

    if (COR !== undefined) {
      fields.push("COR");
      values[String(index)] = COR;
      index++;
    }

    if (DATA_INICIO) {
      fields.push("DATA_INICIO");
      values[String(index)] = formatarDataHoraParaSankhya(DATA_INICIO);
      index++;
    }

    if (DATA_FIM) {
      fields.push("DATA_FIM");
      values[String(index)] = formatarDataHoraParaSankhya(DATA_FIM);
      index++;
    }

    if (ATIVO !== undefined) {
      fields.push("ATIVO");
      values[String(index)] = ATIVO;
      index++;
    }

    const PAYLOAD = {
      "serviceName": "DatasetSP.save",
      "requestBody": {
        "entityName": "AD_ADLEADSATIVIDADES",
        "standAlone": false,
        "fields": fields,
        "records": [{
          "pk": { CODATIVIDADE: String(CODATIVIDADE) },
          "values": values
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
    console.error('Erro ao atualizar atividade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar atividade' },
      { status: 500 }
    );
  }
}
