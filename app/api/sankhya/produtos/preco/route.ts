
import { NextResponse } from 'next/server';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codProd = searchParams.get('codProd');

    if (!codProd) {
      return NextResponse.json(
        { error: 'Código do produto é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🔍 Buscando preço do produto ${codProd}...`);

    const token = await obterToken();
    const axios = require('axios');

    // Buscar preço usando a API da Sankhya
    const url = `https://api.sandbox.sankhya.com.br/v1/precos/produto/${codProd}/tabela/0?pagina=1`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('📦 Resposta da API de preços:', response.data);

    // Extrair o preço da resposta
    let preco = 0;
    if (response.data && response.data.produtos && Array.isArray(response.data.produtos) && response.data.produtos.length > 0) {
      const produto = response.data.produtos[0];
      preco = produto.valor || 0;
    }

    console.log(`💰 Preço encontrado: R$ ${preco}`);

    return NextResponse.json({ preco: parseFloat(preco) || 0 });
  } catch (error: any) {
    console.error('❌ Erro ao buscar preço do produto:', error);
    
    // Se falhar, retornar 0 ao invés de erro
    return NextResponse.json({ preco: 0 });
  }
}
