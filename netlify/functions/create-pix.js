// Netlify Function para criar pagamento PIX via Nivuspay
exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { amount } = JSON.parse(event.body);

    // Validação
    if (!amount || amount < 20) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Valor mínimo é R$ 20,00'
        })
      };
    }

    // Suas credenciais Nivuspay (variáveis de ambiente)
    const publicKey = process.env.NIVUS_PUBLIC_KEY;
    const secretKey = process.env.NIVUS_SECRET_KEY;

    if (!publicKey || !secretKey) {
      throw new Error('Credenciais Nivuspay não configuradas');
    }

    // Criar token de autenticação
    const authToken = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

    // Dados do pagamento
    const paymentData = {
      amount: amount,
      paymentMethod: 'pix',
      items: [{
        title: 'Doação - Ajude o Paraná',
        unitPrice: amount,
        quantity: 1,
        tangible: false
      }],
      customer: {
        name: 'Doador Online',
        email: 'doacao@vakinha.com',
        phone: '11999999999',
        document: {
          type: 'cpf',
          number: '00000000000'
        }
      }
    };

    console.log('Enviando para Nivuspay:', paymentData);

    // Fazer requisição para Nivuspay
    const response = await fetch('https://api.nivuspayments.com.br/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Nivuspay:', errorText);
      throw new Error(`Erro da API: ${response.status}`);
    }

    const data = await response.json();
    console.log('Pagamento criado:', data.id);

    // Retornar resposta formatada
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transaction: {
          id: data.id,
          qrCode: data.pix?.qrcode || '',
          qrCodeText: data.pix?.qrcode || '',
          amount: data.amount,
          status: data.status,
          expirationDate: data.pix?.expirationDate || null
        }
      })
    };

  } catch (error) {
    console.error('Erro:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar pagamento'
      })
    };
  }
};