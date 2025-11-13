import GrpcClient from './src/grpc/client.example.js';

async function testGrpcClient() {
  const client = new GrpcClient('localhost:50051');

  try {
    console.log('🔍 Testing Health Check...');
    const healthResponse = await client.checkHealth();
    console.log('✅ Health Response:', healthResponse);

    console.log('\n📤 Testing WhatsApp Message...');
    const messageResponse = await client.sendMessage(
      '6930989',  // numero (sin código de país)
      '57',       // codigo_pais
      '¡Hola desde gRPC! Este es un mensaje de prueba desde el cliente.'
    );
    console.log('✅ Message Response:', messageResponse);

    if (messageResponse.success && messageResponse.message_id) {
      console.log('\n🔍 Testing Message Status...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      
      const statusResponse = await client.getMessageStatus(messageResponse.message_id);
      console.log('✅ Status Response:', statusResponse);
    }

  } catch (error) {
    console.error('❌ Error testing gRPC client:', error.message);
    console.error('📋 Make sure the gRPC server is running on localhost:50051');
  } finally {
    console.log('\n🔒 Closing client connections...');
    client.close();
  }
}

// Ejecutar prueba
testGrpcClient();