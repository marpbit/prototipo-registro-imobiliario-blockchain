import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  SEPOLIA_CHAIN_ID,
} from './contractConfig';
import './App.css';
import imagemCasa from './assets/casa.jpeg';
function App() {
  const [abaAtiva, setAbaAtiva] = useState('painel');
  // ==========================================
  // ACESSO AO SISTEMA
  // ==========================================
  const [carteira, setCarteira] = useState('');
  const [autorizado, setAutorizado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  // ==========================================
  // CONSULTA DO IMÓVEL
  // ==========================================
  const [idConsulta, setIdConsulta] = useState('');
  const [imovel, setImovel] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [erroConsulta, setErroConsulta] = useState('');
  // ==========================================
  // CONSULTA DO HISTÓRICO
  // ==========================================
  const [historico, setHistorico] = useState(null);
  const [idHistorico, setIdHistorico] = useState('');
  const [consultandoHistorico, setConsultandoHistorico] =
    useState(false);
  const [erroHistorico, setErroHistorico] = useState('');
  // ==========================================
  // CADASTRO DO IMÓVEL
  // ==========================================
  const [novoImovel, setNovoImovel] = useState({
    id: '',
    descricao: '',
    localizacao: '',
    valorAvaliacao: '',
    proprietarioNome: '',
    proprietarioCpf: '',
  });
  const [cadastrando, setCadastrando] = useState(false);
  const [mensagemCadastro, setMensagemCadastro] = useState('');
  const [tipoMensagemCadastro, setTipoMensagemCadastro] =
    useState('');
  // ==========================================
  // TRANSFERÊNCIA DE PROPRIEDADE
  // ==========================================
  const [transferencia, setTransferencia] = useState({
    id: '',
    novoProprietario: '',
    novoCpf: '',
    valorNegociacao: '',
  });
  const [transferindo, setTransferindo] = useState(false);
  const [mensagemTransferencia, setMensagemTransferencia] =
    useState('');
  const [tipoMensagemTransferencia, setTipoMensagemTransferencia] =
    useState('');
  // ==========================================
  // CONECTAR METAMASK E VERIFICAR AUTORIZAÇÃO
  // ==========================================
  async function conectarCarteira() {
    setMensagem('');
    setCarregando(true);
    setAutorizado(false);
    setCarteira('');
    setImovel(null);
    setHistorico(null);
    setErroConsulta('');
    setErroHistorico('');
    try {
      if (!window.ethereum) {
        throw new Error(
          'MetaMask não encontrada. Instale ou habilite a extensão.'
        );
      }
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      let provider = new BrowserProvider(window.ethereum);
      let network = await provider.getNetwork();
      // Verifica se a carteira está na Sepolia
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch {
          throw new Error(
            'Não foi possível mudar para a rede Sepolia na MetaMask.'
          );
        }
        provider = new BrowserProvider(window.ethereum);
        network = await provider.getNetwork();
      }
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error('Conecte a carteira à rede Sepolia.');
      }
      const signer = await provider.getSigner();
      const endereco = await signer.getAddress();
      const contrato = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      // Consulta a carteira autorizada no smart contract
      const funcionarioAutorizado =
        await contrato.funcionarioCartorio();
      const temPermissao =
        endereco.toLowerCase() ===
        funcionarioAutorizado.toLowerCase();
      setCarteira(endereco);
      setAutorizado(temPermissao);
      if (temPermissao) {
        setMensagem(
          'Carteira conectada. Funcionário autorizado.'
        );
      } else {
        setMensagem(
          'Carteira conectada, mas sem permissão para realizar operações de escrita.'
        );
      }
    } catch (erro) {
      setCarteira('');
      setAutorizado(false);
      setMensagem(erro.shortMessage || erro.message);
    } finally {
      setCarregando(false);
    }
  }
  // ==========================================
  // ATUALIZAR CAMPOS DO CADASTRO
  // ==========================================
  function atualizarCampoCadastro(e) {
    const { name, value } = e.target;
    setNovoImovel((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }
  // ==========================================
  // CADASTRAR IMÓVEL NA BLOCKCHAIN
  // ==========================================
  async function cadastrarImovel(e) {
    e.preventDefault();
    setMensagemCadastro('');
    setTipoMensagemCadastro('');
    if (!autorizado) {
      setMensagemCadastro(
        'Apenas o funcionário autorizado pode cadastrar imóveis.'
      );
      setTipoMensagemCadastro('aviso');
      return;
    }
    const {
      id,
      descricao,
      localizacao,
      valorAvaliacao,
      proprietarioNome,
      proprietarioCpf,
    } = novoImovel;
    if (
      !id.trim() ||
      !descricao.trim() ||
      !localizacao.trim() ||
      !valorAvaliacao ||
      !proprietarioNome.trim() ||
      !proprietarioCpf.trim()
    ) {
      setMensagemCadastro(
        'Preencha todos os campos antes de cadastrar.'
      );
      setTipoMensagemCadastro('aviso');
      return;
    }
    const valor = Number(valorAvaliacao);
    if (!Number.isSafeInteger(valor) || valor <= 0) {
      setMensagemCadastro(
        'Informe um valor de avaliação inteiro e maior que zero.'
      );
      setTipoMensagemCadastro('aviso');
      return;
    }
    setCadastrando(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask não encontrada.');
      }
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error(
          'A carteira precisa estar conectada à rede Sepolia.'
        );
      }
      const signer = await provider.getSigner();
      const endereco = await signer.getAddress();
      // Confere novamente a autorização no contrato
      const contratoLeitura = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      const funcionarioAutorizado =
        await contratoLeitura.funcionarioCartorio();
      if (
        endereco.toLowerCase() !==
        funcionarioAutorizado.toLowerCase()
      ) {
        setAutorizado(false);
        throw new Error(
          'A carteira conectada não é a do funcionário autorizado.'
        );
      }
      // Contrato conectado à carteira para enviar a transação
      const contrato = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      setMensagemCadastro(
        'Aguardando a confirmação da transação na MetaMask...'
      );
      setTipoMensagemCadastro('aviso');
      const transacao = await contrato.cadastrarImovel(
        id.trim(),
        descricao.trim(),
        localizacao.trim(),
        valor,
        proprietarioNome.trim(),
        proprietarioCpf.trim()
      );
      setMensagemCadastro(
        'Transação enviada. Aguardando confirmação na Sepolia...'
      );
      const recibo = await transacao.wait();
      if (!recibo || recibo.status !== 1) {
        throw new Error(
          'A transação não foi confirmada com sucesso.'
        );
      }
      setTipoMensagemCadastro('sucesso');
      setMensagemCadastro(
        `Imóvel cadastrado com sucesso! Hash da transação: ${transacao.hash}`
      );
      // Limpa o formulário após a confirmação
      setNovoImovel({
        id: '',
        descricao: '',
        localizacao: '',
        valorAvaliacao: '',
        proprietarioNome: '',
        proprietarioCpf: '',
      });
      // Limpa os resultados anteriores da consulta
      setImovel(null);
      setHistorico(null);
      setErroConsulta('');
      setErroHistorico('');
    } catch (erro) {
      console.error('Erro ao cadastrar imóvel:', erro);
      let mensagemErro =
        erro.shortMessage || erro.reason || erro.message;
      if (
        erro.code === 'ACTION_REJECTED' ||
        erro.code === 4001
      ) {
        mensagemErro =
          'A transação foi rejeitada na MetaMask.';
      } else if (
        mensagemErro?.toLowerCase().includes('revert') ||
        mensagemErro?.toLowerCase().includes('already') ||
        mensagemErro?.toLowerCase().includes('execution reverted')
      ) {
        mensagemErro =
          'O contrato recusou o cadastro. Verifique se o identificador já existe e se os dados são válidos.';
      }
      setMensagemCadastro(
        `Não foi possível cadastrar o imóvel. ${mensagemErro}`
      );
      setTipoMensagemCadastro('aviso');
    } finally {
      setCadastrando(false);
    }
  }
  // ==========================================
  // ATUALIZAR CAMPOS DA TRANSFERÊNCIA
  // ==========================================
  function atualizarCampoTransferencia(e) {
    const { name, value } = e.target;
    setTransferencia((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }
  // ==========================================
  // REGISTRAR TRANSFERÊNCIA NA BLOCKCHAIN
  // ==========================================
  async function registrarTransferencia(e) {
    e.preventDefault();
    setMensagemTransferencia('');
    setTipoMensagemTransferencia('');
    if (!autorizado) {
      setMensagemTransferencia(
        'Apenas o funcionário autorizado pode registrar transferências.'
      );
      setTipoMensagemTransferencia('aviso');
      return;
    }
    const {
      id,
      novoProprietario,
      novoCpf,
      valorNegociacao,
    } = transferencia;
    if (
      !id.trim() ||
      !novoProprietario.trim() ||
      !novoCpf.trim() ||
      !valorNegociacao
    ) {
      setMensagemTransferencia(
        'Preencha todos os campos antes de registrar a transferência.'
      );
      setTipoMensagemTransferencia('aviso');
      return;
    }
    const valor = Number(valorNegociacao);
    if (!Number.isSafeInteger(valor) || valor <= 0) {
      setMensagemTransferencia(
        'Informe um valor de negociação inteiro e maior que zero.'
      );
      setTipoMensagemTransferencia('aviso');
      return;
    }
    setTransferindo(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask não encontrada.');
      }
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error(
          'A carteira precisa estar conectada à rede Sepolia.'
        );
      }
      const signer = await provider.getSigner();
      const endereco = await signer.getAddress();
      // Confere novamente a autorização no contrato
      const contratoLeitura = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      const funcionarioAutorizado =
        await contratoLeitura.funcionarioCartorio();
      if (
        endereco.toLowerCase() !==
        funcionarioAutorizado.toLowerCase()
      ) {
        setAutorizado(false);
        throw new Error(
          'A carteira conectada não é a do funcionário autorizado.'
        );
      }
      // Contrato conectado à carteira para escrever na blockchain
      const contrato = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      setMensagemTransferencia(
        'Aguardando a confirmação da transação na MetaMask...'
      );
      setTipoMensagemTransferencia('aviso');
      const transacao = await contrato.registrarTransferencia(
        id.trim(),
        novoProprietario.trim(),
        novoCpf.trim(),
        valor
      );
      setMensagemTransferencia(
        'Transação enviada. Aguardando confirmação na Sepolia...'
      );
      const recibo = await transacao.wait();
      if (!recibo || recibo.status !== 1) {
        throw new Error(
          'A transação não foi confirmada com sucesso.'
        );
      }
      setMensagemTransferencia(
        `Transferência registrada com sucesso! Hash da transação: ${transacao.hash}`
      );
      setTipoMensagemTransferencia('sucesso');
      // Limpa o formulário após a confirmação
      setTransferencia({
        id: '',
        novoProprietario: '',
        novoCpf: '',
        valorNegociacao: '',
      });
      // O histórico exibido pode estar desatualizado
      setHistorico(null);
      setErroHistorico('');
      // Atualiza os dados se o imóvel estiver na consulta atual
      if (imovel && imovel.id === id.trim()) {
        const dadosAtualizados =
          await contratoLeitura.consultarImovel(id.trim());
        setImovel({
          id: dadosAtualizados.id,
          descricao: dadosAtualizados.descricao,
          localizacao: dadosAtualizados.localizacao,
          valorAvaliacao:
            dadosAtualizados.valorAvaliacao.toString(),
          proprietarioNome: dadosAtualizados.proprietarioNome,
          proprietarioCpf: dadosAtualizados.proprietarioCpf,
        });
      }
    } catch (erro) {
      console.error('Erro ao transferir imóvel:', erro);
      let mensagemErro =
        erro.shortMessage || erro.reason || erro.message;
      if (
        erro.code === 'ACTION_REJECTED' ||
        erro.code === 4001
      ) {
        mensagemErro =
          'A transação foi rejeitada na MetaMask.';
      } else if (
        mensagemErro?.toLowerCase().includes('revert') ||
        mensagemErro?.toLowerCase().includes('execution reverted')
      ) {
        mensagemErro =
          'O contrato recusou a transferência. Verifique se o imóvel existe, se os dados são válidos e se o novo proprietário é diferente do atual.';
      }
      setMensagemTransferencia(
        `Não foi possível registrar a transferência. ${mensagemErro}`
      );
      setTipoMensagemTransferencia('aviso');
    } finally {
      setTransferindo(false);
    }
  }
  // ==========================================
  // CONSULTAR DADOS ATUAIS DO IMÓVEL
  // ==========================================
  async function consultarImovel() {
    setImovel(null);
    setHistorico(null);
    setErroConsulta('');
    setErroHistorico('');
    if (!idConsulta.trim()) {
      setErroConsulta('Informe o identificador do imóvel.');
      return;
    }
    setConsultando(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask não encontrada.');
      }
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error(
          'A carteira precisa estar conectada à rede Sepolia.'
        );
      }
      const contrato = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      const dados = await contrato.consultarImovel(
        idConsulta.trim()
      );
      setImovel({
        id: dados.id,
        descricao: dados.descricao,
        localizacao: dados.localizacao,
        valorAvaliacao: dados.valorAvaliacao.toString(),
        proprietarioNome: dados.proprietarioNome,
        proprietarioCpf: dados.proprietarioCpf,
      });
    } catch (erro) {
      console.error('Erro ao consultar imóvel:', erro);
      setErroConsulta(
        'Não foi possível consultar o imóvel. Verifique o identificador informado.'
      );
    } finally {
      setConsultando(false);
    }
  }
  // ==========================================
  // CONSULTAR HISTÓRICO DE TRANSFERÊNCIAS
  // ==========================================
  async function consultarHistorico() {
    setHistorico(null);
    setErroHistorico('');
    if (!idHistorico.trim()) {
      setErroHistorico('Informe o identificador do imóvel.');
      return;
    }
    setConsultandoHistorico(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask não encontrada.');
      }
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error(
          'A carteira precisa estar conectada à rede Sepolia.'
        );
      }
      const contrato = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      const registros = await contrato.consultarHistorico(
        idHistorico.trim()
      );
      setHistorico(Array.from(registros));
    } catch (erro) {
      console.error('Erro ao consultar histórico:', erro);
      setErroHistorico(
        'Não foi possível consultar o histórico. Verifique o identificador informado.'
      );
    } finally {
      setConsultandoHistorico(false);
    }
  }
  // ==========================================
  // FORMATAR VALORES E DATAS
  // ==========================================
  function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
  function formatarData(timestamp) {
    const data = new Date(Number(timestamp) * 1000);
    if (Number.isNaN(data.getTime())) {
      return 'Data indisponível';
    }
    return data.toLocaleString('pt-BR');
  }
  // ==========================================
  // INTERFACE DA APLICAÇÃO
  // ==========================================
  const menu = [
    { id: 'painel', titulo: 'Painel', icone: '▦' },
    { id: 'imoveis', titulo: 'Imóveis', icone: '⌂' },
    { id: 'cadastrar', titulo: 'Cadastrar imóvel', icone: '＋' },
    { id: 'transferencias', titulo: 'Registrar transferência', icone: '⇄' },
    { id: 'historico', titulo: 'Histórico', icone: '◷' },
  ];

  // A interface acompanha a autorização consultada no contrato inteligente.
  // O contrato continua sendo a proteção efetiva das operações de escrita.
  const menuDisponivel = autorizado
    ? menu
    : menu.filter((item) =>
        ['painel', 'imoveis', 'historico'].includes(item.id)
      );

  return (
    <main className="aplicacao">
      {!carteira ? (
        <>
          <header className="topo-acesso">
            <div className="marca">
              <div className="marca-icone">⌂</div>
              <div>
                <h1>Registro Imobiliário</h1>
                <p>Sistema de rastreabilidade registral</p>
              </div>
            </div>
          </header>

          <section className="acesso-layout acesso-layout-simples">
            <div className="acesso-apresentacao acesso-apresentacao-simples">
              <span className="etiqueta">PROTÓTIPO ACADÊMICO</span>
            </div>

            <div className="cartao-acesso">
              <img className="acesso-logo" src={imagemCasa} alt="Ícone de uma casa" />
              <h2>Acesso ao sistema</h2>
              <p>Conecte sua carteira MetaMask.</p>
              <button
                className="botao-principal botao-acesso"
                onClick={conectarCarteira}
                disabled={carregando}
              >
                {carregando ? 'Conectando...' : 'Conectar'}
              </button>
              {mensagem && (
                <div className={`mensagem ${autorizado ? 'sucesso' : 'aviso'}`}>
                  {mensagem}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="estrutura-sistema">
          <aside className="menu-lateral">
            <div className="marca marca-lateral">
              <div className="marca-icone">⌂</div>
              <div>
                <h1>Registro<br />Imobiliário</h1>
                <p>Sistema de rastreabilidade registral</p>
              </div>
            </div>

            <div className="menu-titulo">MENU PRINCIPAL</div>
            <nav className="navegacao">
              {menuDisponivel.map((item) => (
                <button
                  key={item.id}
                  className={`item-menu ${abaAtiva === item.id ? 'ativo' : ''}`}
                  onClick={() => setAbaAtiva(item.id)}
                  type="button"
                >
                  <span className="icone-menu">{item.icone}</span>
                  {item.titulo}
                </button>
              ))}
            </nav>

            <div className="menu-rodape">
              <button className="botao-desconectar" type="button" onClick={() => {
                setCarteira('');
                setAutorizado(false);
                setMensagem('');
                setAbaAtiva('painel');
              }}>
                Desconectar carteira
              </button>
            </div>
          </aside>

          <section className="area-principal">
            <header className="barra-superior">
              <div>
                <span className="breadcrumb">Sistema / {menuDisponivel.find((item) => item.id === abaAtiva)?.titulo || 'Painel'}</span>
                <h2>{menuDisponivel.find((item) => item.id === abaAtiva)?.titulo || 'Painel'}</h2>
              </div>
              <div className="usuario-conectado">
                <div className="avatar-usuario">◎</div>
                <div>
                  <strong>{autorizado ? 'Funcionário autorizado' : 'Acesso para consulta'}</strong>
                  <span>{`${carteira.slice(0, 6)}...${carteira.slice(-4)}`}</span>
                </div>
              </div>
            </header>

            {abaAtiva === 'painel' && (
              <div className="conteudo">
                <div className="boas-vindas">
                  <h3>Bem-vindo ao Registro Imobiliário</h3>
                </div>

                <div className="grade-indicadores">
                  {autorizado ? (
                    <>
                      <article className="indicador-card">
                        <div className="indicador-icone azul">＋</div>
                        <div>
                          <strong>Cadastrar imóvel</strong>
                          <p>Inclua um novo imóvel no sistema registral.</p>
                        </div>
                        <button type="button" className="link-acao" onClick={() => setAbaAtiva('cadastrar')}>
                          Acessar cadastro →
                        </button>
                      </article>

                      <article className="indicador-card">
                        <div className="indicador-icone verde">↔</div>
                        <div>
                          <strong>Registrar transferência</strong>
                          <p>Registre uma transferência vinculada a um imóvel.</p>
                        </div>
                        <button type="button" className="link-acao" onClick={() => setAbaAtiva('transferencias')}>
                          Acessar transferências →
                        </button>
                      </article>
                    </>
                  ) : (
                    <>
                      <article className="indicador-card">
                        <div className="indicador-icone azul">⌕</div>
                        <div>
                          <strong>Consultar imóvel</strong>
                          <p>Consulte os dados de um imóvel cadastrado.</p>
                        </div>
                        <button type="button" className="link-acao" onClick={() => setAbaAtiva('imoveis')}>
                          Acessar consulta →
                        </button>
                      </article>

                      <article className="indicador-card">
                        <div className="indicador-icone verde">◷</div>
                        <div>
                          <strong>Consultar histórico</strong>
                          <p>Consulte o histórico de transferências de um imóvel.</p>
                        </div>
                        <button type="button" className="link-acao" onClick={() => setAbaAtiva('historico')}>
                          Acessar histórico →
                        </button>
                      </article>
                    </>
                  )}
                </div>

                <section className="painel-informacao">
                  <h3>Conexão com a blockchain</h3>
                  <div className="linha-informacao">
                    <span>Rede conectada</span><strong>Ethereum Sepolia</strong>
                  </div>
                  <div className="linha-informacao">
                    <span>Carteira</span><strong className="endereco-carteira">{carteira}</strong>
                  </div>
                  <div className="linha-informacao">
                    <span>Nível de acesso</span>
                    <strong>{autorizado ? 'Funcionário autorizado — leitura e escrita' : 'Somente consulta'}</strong>
                  </div>
                </section>
              </div>
            )}

            {abaAtiva === 'cadastrar' && (
              <div className="conteudo">
                {autorizado ? (
                  <>
                  <section className="cartao">
                    <div className="titulo-secao">
                      <div>
                        <h3>Cadastrar imóvel</h3>
                      </div>
                      <span className="selo-permissao">Acesso autorizado</span>
                    </div>
                    <form className="formulario grade-formulario" onSubmit={cadastrarImovel}>
                      <label htmlFor="id">Identificador do imóvel</label>
                      <input id="id" name="id" type="text" placeholder="Ex.: IMV002" value={novoImovel.id} onChange={atualizarCampoCadastro} disabled={cadastrando} required />

                      <label htmlFor="descricao">Descrição</label>
                      <input id="descricao" name="descricao" type="text" placeholder="Ex.: Casa residencial" value={novoImovel.descricao} onChange={atualizarCampoCadastro} disabled={cadastrando} required />

                      <label htmlFor="localizacao">Localização</label>
                      <input id="localizacao" name="localizacao" type="text" placeholder="Endereço do imóvel" value={novoImovel.localizacao} onChange={atualizarCampoCadastro} disabled={cadastrando} required />

                      <label htmlFor="valorAvaliacao">Valor de avaliação (R$)</label>
                      <input id="valorAvaliacao" name="valorAvaliacao" type="number" min="1" step="1" placeholder="Ex.: 450000" value={novoImovel.valorAvaliacao} onChange={atualizarCampoCadastro} disabled={cadastrando} required />

                      <label htmlFor="proprietarioNome">Nome do proprietário</label>
                      <input id="proprietarioNome" name="proprietarioNome" type="text" placeholder="Nome completo" value={novoImovel.proprietarioNome} onChange={atualizarCampoCadastro} disabled={cadastrando} required />

                      <label htmlFor="proprietarioCpf">CPF do proprietário</label>
                      <input id="proprietarioCpf" name="proprietarioCpf" type="text" placeholder="Ex.: ***.***.***-00" value={novoImovel.proprietarioCpf} onChange={atualizarCampoCadastro} disabled={cadastrando} required />

                      <div className="formulario-acoes">
                        <button className="botao-principal" type="submit" disabled={cadastrando}>
                          {cadastrando ? 'Processando cadastro...' : 'Cadastrar imóvel'}
                        </button>
                      </div>
                    </form>
                    {mensagemCadastro && <div className={`mensagem ${tipoMensagemCadastro}`}>{mensagemCadastro}</div>}
                  </section>
                  </>
                ) : (
                  <section className="cartao">
                    <h3>Acesso restrito</h3>
                    <p>Somente a carteira do funcionário autorizado pode cadastrar imóveis.</p>
                  </section>
                )}
              </div>
            )}

            {abaAtiva === 'imoveis' && (
              <div className="conteudo">

                <section className="cartao">
                  <h3>Consultar imóvel</h3>
                  <div className="campo-consulta">
                    <input
                      type="text"
                      placeholder="Ex.: IMV001"
                      value={idConsulta}
                      onChange={(e) => setIdConsulta(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') consultarImovel(); }}
                    />
                    <button className="botao-principal" onClick={consultarImovel} disabled={consultando}>
                      {consultando ? 'Consultando...' : 'Consultar imóvel'}
                    </button>
                  </div>
                  {erroConsulta && <div className="mensagem aviso">{erroConsulta}</div>}

                  {imovel && (
                    <div className="resultado">
                      <div className="titulo-secao">
                        <div>
                          <h3>Dados do imóvel</h3>
                        </div>
                        <span className="selo-permissao">Registro localizado</span>
                      </div>
                      <div className="dados-imovel">
                        <div><span>Identificador</span><strong>{imovel.id}</strong></div>
                        <div><span>Descrição</span><strong>{imovel.descricao}</strong></div>
                        <div><span>Localização</span><strong>{imovel.localizacao}</strong></div>
                        <div><span>Valor de avaliação</span><strong>{formatarValor(imovel.valorAvaliacao)}</strong></div>
                        <div><span>Proprietário atual</span><strong>{imovel.proprietarioNome}</strong></div>
                        <div><span>CPF</span><strong>{imovel.proprietarioCpf}</strong></div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {abaAtiva === 'transferencias' && (
              <div className="conteudo">
                {autorizado ? (
                <section className="cartao">
                  <h3>Registrar transferência</h3>
                  <form className="formulario grade-formulario" onSubmit={registrarTransferencia}>
                    <label htmlFor="idTransferencia">Identificador do imóvel</label>
                    <input id="idTransferencia" name="id" type="text" placeholder="Ex.: IMV001" value={transferencia.id} onChange={atualizarCampoTransferencia} disabled={transferindo} required />

                    <label htmlFor="novoProprietario">Nome do novo proprietário</label>
                    <input id="novoProprietario" name="novoProprietario" type="text" placeholder="Nome completo" value={transferencia.novoProprietario} onChange={atualizarCampoTransferencia} disabled={transferindo} required />

                    <label htmlFor="novoCpf">CPF do novo proprietário</label>
                    <input id="novoCpf" name="novoCpf" type="text" placeholder="Ex.: ***.***.***-11" value={transferencia.novoCpf} onChange={atualizarCampoTransferencia} disabled={transferindo} required />

                    <label htmlFor="valorNegociacao">Valor da negociação (R$)</label>
                    <input id="valorNegociacao" name="valorNegociacao" type="number" min="1" step="1" placeholder="Ex.: 420000" value={transferencia.valorNegociacao} onChange={atualizarCampoTransferencia} disabled={transferindo} required />

                    <div className="formulario-acoes">
                      <button className="botao-principal" type="submit" disabled={transferindo}>
                        {transferindo ? 'Processando transferência...' : 'Registrar transferência'}
                      </button>
                    </div>
                  </form>
                  {mensagemTransferencia && <div className={`mensagem ${tipoMensagemTransferencia}`}>{mensagemTransferencia}</div>}
                </section>
                ) : (
                  <section className="cartao">
                    <h3>Acesso restrito</h3>
                    <p>Somente a carteira do funcionário autorizado pode registrar transferências.</p>
                  </section>
                )}
              </div>
            )}

            {abaAtiva === 'historico' && (
              <div className="conteudo">
                <section className="cartao">
                  <h3>Histórico de transferências</h3>
                  <div className="campo-consulta">
                    <input
                      type="text"
                      placeholder="Ex.: IMV001"
                      value={idHistorico}
                      onChange={(e) => {
                        setIdHistorico(e.target.value);
                        setHistorico(null);
                        setErroHistorico('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') consultarHistorico();
                      }}
                    />
                    <button
                      className="botao-principal"
                      onClick={consultarHistorico}
                      disabled={consultandoHistorico}
                    >
                      {consultandoHistorico ? 'Consultando...' : 'Consultar histórico'}
                    </button>
                  </div>
                  {erroHistorico && <div className="mensagem aviso">{erroHistorico}</div>}
                  {historico !== null && (
                    <div className="historico">
                      {historico.length === 0 ? (
                        <p>Nenhuma transferência registrada para este imóvel.</p>
                      ) : (
                        <div className="lista-historico">
                          {historico.map((registro, indice) => (
                            <article className="registro-historico" key={indice}>
                              <h4>Transferência {indice + 1}</h4>
                              <div className="dados-imovel">
                                <div><span>Proprietário anterior</span><strong>{registro.proprietarioAnterior}</strong></div>
                                <div><span>CPF anterior</span><strong>{registro.cpfAnterior}</strong></div>
                                <div><span>Novo proprietário</span><strong>{registro.novoProprietario}</strong></div>
                                <div><span>CPF novo</span><strong>{registro.cpfNovo}</strong></div>
                                <div><span>Valor da negociação</span><strong>{formatarValor(registro.valorNegociacao)}</strong></div>
                                <div><span>Data</span><strong>{formatarData(registro.data)}</strong></div>
                                <div><span>Funcionário responsável</span><strong>{registro.funcionarioResponsavel}</strong></div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}

            <footer className="rodape-sistema">
              Protótipo acadêmico
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
