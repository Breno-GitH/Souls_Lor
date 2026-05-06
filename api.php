<?php
// Configura os cabeçalhos para aceitar JSON e responder em JSON
header('Content-Type: application/json');

// Lê o corpo da requisição que o JavaScript enviou (via Fetch API)
$requestPayload = file_get_contents("php://input");

// Converte o JSON em um objeto PHP
$data = json_decode($requestPayload);

// Verifica se os dados chegaram corretamente
if (isset($data->hero) && !empty($data->hero)) {
    
    $chosenHero = htmlspecialchars($data->hero); // Proteção contra XSS
    $timestamp = date('Y-m-d H:i:s');
    
    // Aqui nós normalmente faríamos um INSERT no MySQL (Banco de Dados).
    // Para simplificar e rodar na sua máquina agora, vamos salvar em um arquivo JSON.
    $saveFile = 'save_data.json';
    
    // Prepara os dados para salvar
    $saveData = [
        "last_played" => $timestamp,
        "selected_hero" => $chosenHero,
        "level" => 1,
        "gold" => 0
    ];
    
    // Escreve no arquivo de texto
    file_put_contents($saveFile, json_encode($saveData, JSON_PRETTY_PRINT));
    
    // Responde ao JavaScript que deu tudo certo
    echo json_encode([
        "status" => "success",
        "message" => "Herói salvo com sucesso",
        "saved_hero" => $chosenHero
    ]);

} else {
    // Se o JS não mandou o herói, devolve um erro
    http_response_code(400); // Bad Request
    echo json_encode([
        "status" => "error",
        "message" => "Nenhum herói foi selecionado."
    ]);
}
?>