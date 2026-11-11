// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RegistroImobiliario {

// =========================================================
// FUNCIONÁRIO AUTORIZADO
// =========================================================

// Carteira que representa o funcionário autorizado do cartório
address public funcionarioCartorio;


// =========================================================
// ESTRUTURA DO IMÓVEL
// =========================================================

struct Imovel {
    string id;
    string descricao;
    string localizacao;

    // Valor de avaliação inicial do imóvel
    uint256 valorAvaliacao;

    // Proprietário atual
    string proprietarioNome;
    string proprietarioCpf;

    // Indica se o imóvel está cadastrado
    bool existe;
}


// =========================================================
// ESTRUTURA DO HISTÓRICO
// =========================================================

struct RegistroHistorico {

    // Proprietário antes da transferência
    string proprietarioAnterior;
    string cpfAnterior;

    // Novo proprietário
    string novoProprietario;
    string cpfNovo;

    // Valor efetivamente negociado na transferência
    uint256 valorNegociacao;

    // Data/hora registrada pela blockchain
    uint256 data;

    // Carteira do funcionário que realizou a operação
    address funcionarioResponsavel;
}


// =========================================================
// ARMAZENAMENTO
// =========================================================

// Imóveis identificados pelo seu ID
mapping(string => Imovel) private imoveis;

// Histórico de transferências de cada imóvel
mapping(string => RegistroHistorico[]) private historico;


// =========================================================
// EVENTOS
// =========================================================

// Evento emitido quando um imóvel é cadastrado
event ImovelCadastrado(
    string id,
    string proprietarioNome,
    uint256 valorAvaliacao,        
    address funcionarioResponsavel,
    uint256 data
);


// Evento emitido quando ocorre uma transferência
event ImovelTransferido(
    string id,
    string proprietarioAnterior,
    string novoProprietario,
    uint256 valorNegociacao,
    address funcionarioResponsavel,
    uint256 data
);


// =========================================================
// CONSTRUTOR
// =========================================================

// A carteira que implanta o contrato se torna
// o funcionário autorizado do cartório.
constructor() {
    funcionarioCartorio = msg.sender;
}


// =========================================================
// MODIFIER
// =========================================================

// Garante que somente a carteira autorizada
// possa realizar operações de escrita.
modifier apenasFuncionario() {
    require(
        msg.sender == funcionarioCartorio,
        "Apenas funcionario autorizado"
    );

    _;
}


// =========================================================
// CADASTRO DO IMÓVEL
// =========================================================

function cadastrarImovel(
    string calldata _id,
    string calldata _descricao,
    string calldata _localizacao,
    uint256 _valorAvaliacao,
    string calldata _proprietarioNome,
    string calldata _proprietarioCpf
)
    external
    apenasFuncionario
{

    require(
        bytes(_id).length > 0,
        "ID do imovel obrigatorio"
    );

    require(
        !imoveis[_id].existe,
        "Imovel ja cadastrado"
    );

    require(
        bytes(_descricao).length > 0,
        "Descricao obrigatoria"
    );

    require(
        bytes(_localizacao).length > 0,
        "Localizacao obrigatoria"
    );

    require(
        _valorAvaliacao > 0,
        "Valor de avaliacao deve ser maior que zero"
    );

    require(
        bytes(_proprietarioNome).length > 0,
        "Nome do proprietario obrigatorio"
    );

    require(
        bytes(_proprietarioCpf).length > 0,
        "CPF do proprietario obrigatorio"
    );


    // =====================================================
    // CRIA O IMÓVEL
    // =====================================================

    imoveis[_id] = Imovel({
        id: _id,
        descricao: _descricao,
        localizacao: _localizacao,
        valorAvaliacao: _valorAvaliacao,
        proprietarioNome: _proprietarioNome,
        proprietarioCpf: _proprietarioCpf,
        existe: true
    });


    // =====================================================
    // EVENTO DO CADASTRO
    // =====================================================

    emit ImovelCadastrado(
        _id,
        _proprietarioNome,
        _valorAvaliacao,
        msg.sender,
        block.timestamp
    );
}


// =========================================================
// CONSULTA DO IMÓVEL
// =========================================================

function consultarImovel(
    string calldata _id
)
    external
    view
    returns (
        string memory id,
        string memory descricao,
        string memory localizacao,
        uint256 valorAvaliacao,
        string memory proprietarioNome,
        string memory proprietarioCpf
    )
{

    require(
        imoveis[_id].existe,
        "Imovel nao cadastrado"
    );


    Imovel memory imovel = imoveis[_id];


    return (
        imovel.id,
        imovel.descricao,
        imovel.localizacao,
        imovel.valorAvaliacao,
        imovel.proprietarioNome,
        imovel.proprietarioCpf
    );
}


// =========================================================
// TRANSFERÊNCIA DO IMÓVEL
// =========================================================

function registrarTransferencia(
    string calldata _id,
    string calldata _novoProprietario,
    string calldata _novoCpf,
    uint256 _valorNegociacao
)
    external
    apenasFuncionario
{

    // =====================================================
    // VALIDAÇÕES
    // =====================================================

    // Verifica se o imóvel existe
    require(
        imoveis[_id].existe,
        "Imovel nao cadastrado"
    );


    // Verifica se o novo proprietário foi informado
    require(
        bytes(_novoProprietario).length > 0,
        "Nome do novo proprietario obrigatorio"
    );


    // Verifica se o CPF foi informado
    require(
        bytes(_novoCpf).length > 0,
        "CPF do novo proprietario obrigatorio"
    );


    // Verifica se foi informado um valor de negociação
    require(
        _valorNegociacao > 0,
        "Valor da negociacao deve ser maior que zero"
    );


    // =====================================================        
    // Impede transferência para o mesmo CPF
    // =====================================================

    require(
        keccak256(bytes(imoveis[_id].proprietarioCpf))
            != keccak256(bytes(_novoCpf)),
        "Novo proprietario deve ser diferente do atual"
    );


    // =====================================================
    // GUARDA OS DADOS DO PROPRIETÁRIO ATUAL
    // =====================================================

    string memory proprietarioAnterior =
        imoveis[_id].proprietarioNome;

    string memory cpfAnterior =
        imoveis[_id].proprietarioCpf;


    // =====================================================
    // REGISTRA A TRANSFERÊNCIA NO HISTÓRICO
    // =====================================================

    historico[_id].push(
        RegistroHistorico({
            proprietarioAnterior: proprietarioAnterior,
            cpfAnterior: cpfAnterior,
            novoProprietario: _novoProprietario,
            cpfNovo: _novoCpf,
            valorNegociacao: _valorNegociacao,
            data: block.timestamp,
            funcionarioResponsavel: msg.sender
        })
    );


    // =====================================================
    // ATUALIZA O PROPRIETÁRIO ATUAL DO IMÓVEL
    // =====================================================

    imoveis[_id].proprietarioNome =
        _novoProprietario;

    imoveis[_id].proprietarioCpf =
        _novoCpf;


    // =====================================================
    // EVENTO DA TRANSFERÊNCIA
    // =====================================================

    emit ImovelTransferido(
        _id,
        proprietarioAnterior,
        _novoProprietario,
        _valorNegociacao,
        msg.sender,
        block.timestamp
    );
}


// =========================================================
// CONSULTA DO HISTÓRICO
// =========================================================

function consultarHistorico(
    string calldata _id
)
    external
    view
    returns (
        RegistroHistorico[] memory
    )
{

    require(
        imoveis[_id].existe,
        "Imovel nao cadastrado"
    );


    return historico[_id];
}

}
