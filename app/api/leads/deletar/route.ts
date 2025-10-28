
import { NextResponse } from 'next/server';
import { deletarLead } from '@/lib/leads-service';

export async function POST(request: Request) {
  try {
    const { codLeed } = await request.json();
    
    await deletarLead(codLeed);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ API Route - Erro ao deletar lead:', error.message);
    
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar lead' },
      { status: 500 }
    );
  }
}
