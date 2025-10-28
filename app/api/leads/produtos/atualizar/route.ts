
import { NextResponse } from 'next/server';

const URL_SAVE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";
const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";

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

  const axios = require('axios');
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

async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}) {
  const token = await obterToken();
  const axios = require('axios');

  const config = {
    method: method.toLowerCase(),
    url: fullUrl,
    data: data,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const resposta = await axios(config);
  return resposta.data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📥 Dados recebidos na API atualizar:', body);
    
    const { codItem, codLead, quantidade, vlrunit } = body;

    if (!codItem || !quantidade || !vlrunit) {
      console.error('❌ Dados obrigatórios faltando:', { codItem, quantidade, vlrunit });
      return NextResponse.json(
        { error: 'codItem, quantidade e vlrunit são obrigatórios' },
        { status: 400 }
      );
    }

    if (!codLead) {
      console.error('❌ codLead é obrigatório para recalcular o total');
      return NextResponse.json(
        { error: 'codLead é obrigatório' },
        { status: 400 }
      );
    }

    const vlrtotal = Number(quantidade) * Number(vlrunit);
    console.log('💰 Calculando total do produto:', { quantidade, vlrunit, vlrtotal });

    // 1. Atualizar o produto
    const PAYLOAD_PRODUTO = {
      "serviceName": "DatasetSP.save",
      "requestBody": {
        "entityName": "AD_ADLEADSPRODUTOS",
        "standAlone": false,
        "fields": ["QUANTIDADE", "VLRUNIT", "VLRTOTAL"],
        "records": [{
          "pk": { CODITEM: String(codItem) },
          "values": {
            "0": String(quantidade),
            "1": String(vlrunit),
            "2": String(vlrtotal)
          }
        }]
      }
    };

    console.log('📝 Atualizando produto:', JSON.stringify(PAYLOAD_PRODUTO, null, 2));
    const respostaProduto = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD_PRODUTO);
    console.log('✅ Produto atualizado:', respostaProduto);

    // 2. Recalcular o valor total do lead
    let novoValorTotal = 0;
    console.log('🔍 Recalculando valor total do lead:', codLead);
      
    // Consultar todos os produtos do lead
    const URL_CONSULTA = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
    const PAYLOAD_CONSULTA = {
      "requestBody": {
        "dataSet": {
          "rootEntity": "AD_ADLEADSPRODUTOS",
          "includePresentationFields": "S",
          "offsetPage": "0",
          "entity": {
            "fieldset": {
              "list": "VLRTOTAL"
            }
          },
          "criteria": {
            "expression": {
              "$": `CODLEAD = '${codLead}' AND ATIVO = 'S'`
            }
          }
        }
      }
    };

    const responseProdutos = await fazerRequisicaoAutenticada(URL_CONSULTA, 'POST', PAYLOAD_CONSULTA);
    console.log('📋 Resposta da consulta de produtos:', JSON.stringify(responseProdutos, null, 2));
    
    // Calcular o valor total
    if (responseProdutos?.responseBody?.entities?.entity) {
      const entities = Array.isArray(responseProdutos.responseBody.entities.entity) 
        ? responseProdutos.responseBody.entities.entity 
        : [responseProdutos.responseBody.entities.entity];
      
      novoValorTotal = entities.reduce((sum: number, e: any) => {
        const vlr = Number(e.f0?.$ || 0);
        console.log('➕ Somando produto:', vlr);
        return sum + vlr;
      }, 0);

      console.log('💰 Valor total calculado:', novoValorTotal);
    } else {
      console.log('⚠️ Nenhum produto ativo encontrado para o lead');
    }

    // 3. Formatar data no padrão DD/MM/YYYY
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    // 4. Atualizar o valor total do lead na tabela AD_LEADS
    const PAYLOAD_LEAD = {
      "serviceName": "DatasetSP.save",
      "requestBody": {
        "entityName": "AD_LEADS",
        "standAlone": false,
        "fields": ["VALOR", "DATA_ATUALIZACAO"],
        "records": [{
          "pk": { CODLEAD: String(codLead) },
          "values": {
            "0": String(novoValorTotal),
            "1": dataFormatada
          }
        }]
      }
    };

    console.log('📝 Payload para atualizar lead:', JSON.stringify(PAYLOAD_LEAD, null, 2));
    const respostaLead = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD_LEAD);
    console.log('✅ Lead atualizado com novo valor total:', JSON.stringify(respostaLead, null, 2));

    return NextResponse.json({ 
      success: true,
      novoValorTotal: novoValorTotal
    });
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar produto' },
      { status: 500 }
    );
  }
}
