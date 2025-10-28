
import { NextResponse } from 'next/server';
import { Client } from '@replit/object-storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Apenas imagens são permitidas' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Imagem muito grande. Máximo 5MB' },
        { status: 400 }
      );
    }

    // Converter arquivo para buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `avatars/${timestamp}.${extension}`;

    // Fazer upload para Object Storage
    const client = new Client();
    await client.uploadFromBytes(fileName, buffer);

    // Retornar URL da imagem
    // A URL será o caminho relativo que será servido pela API
    const imageUrl = `/api/storage/${fileName}`;

    return NextResponse.json({ url: imageUrl });
  } catch (error: any) {
    console.error('Erro ao fazer upload:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer upload' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
