import React from "react";
import { ImageWithFallback } from "./ImageWithFallback";

const brandImage = "/brandbooks/claudia/image.png";
const photoImage = "/brandbooks/claudia/C_pia_e_recria__o_de_logo.png";
const logoImage = "/brandbooks/claudia/simbolo4.png";
import { 
  Atom, 
  Sparkles, 
  Eye, 
  Fingerprint, 
  Quote, 
  BookOpen,
  Camera,
  Layers,
  Layout,
  MessageSquare,
  ShieldCheck
} from "lucide-react";

const COLORS = {
  primary: "#D95C14", // Laranja Queimado
  primaryAlt: "#E8A81C", // Mostarda Vintage
  secondary: "#0F4C5C", // Azul Petróleo
  accent: "#9A031E", // Vermelho Cereja
  background: "#EBE3D5", // Fundo quente vintage
  text: "#2D2622", // Texto escuro quente
};

const Section = ({
  children,
  className = "",
  style = {},
  id,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}) => (
  <section id={id} className={`scroll-mt-20 py-20 px-6 md:px-12 lg:px-24 ${className}`} style={style}>
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

const Heading = ({ children, level = 2, className = "", style = {} }: any) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <Tag 
      className={`font-['Fraunces'] font-bold tracking-tight ${className}`} 
      style={{ ...style }}
    >
      {children}
    </Tag>
  );
};

export function ClaudiaBrandbook() {
  const [activeDesignTab, setActiveDesignTab] = React.useState("cores");

  return (
    <div 
      className="min-h-screen font-['Inter'] selection:bg-[#D95C14] selection:text-white"
      style={{ backgroundColor: COLORS.background, color: COLORS.text }}
    >
      {/* 1. HERO SECTION */}
      <section
        id="inicio"
        className="relative min-h-screen flex scroll-mt-20 items-center justify-center overflow-hidden px-6"
        style={{ backgroundColor: COLORS.secondary, color: COLORS.background }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }}></div>
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-8 py-12">
          
          <div className="w-32 h-32 md:w-48 md:h-48 mb-4">
            <ImageWithFallback src={logoImage} alt="Cláudia Tambelini Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <p className="text-sm md:text-lg uppercase tracking-widest mb-4 font-bold" style={{ color: COLORS.primaryAlt }}>
              Brandbook Oficial
            </p>
            <Heading level={1} className="text-5xl md:text-7xl lg:text-8xl mb-2 leading-tight">
              Cláudia Tambelini
            </Heading>
            <p className="text-sm md:text-base uppercase tracking-widest mb-6 font-bold font-['Inter'] opacity-80">
              Terapeuta Transpessoal
            </p>
            <p className="text-2xl md:text-3xl font-['Fraunces'] italic mb-10 opacity-90">
              A Intérprete do invisível
            </p>
          </div>
        </div>
      </section>

      {/* 2. O CORAÇÃO DA MARCA */}
      <Section id="essencia" className="border-b-4" style={{ borderColor: COLORS.secondary }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <Heading className="text-4xl md:text-6xl mb-8" style={{ color: COLORS.secondary }}>
              A Promessa Única
            </Heading>
            <div className="relative p-8 border-l-4" style={{ borderColor: COLORS.primary, backgroundColor: 'rgba(217, 92, 20, 0.1)' }}>
              <Quote className="absolute top-4 right-4 opacity-10" size={64} style={{ color: COLORS.primary }} />
              <p className="text-xl md:text-2xl font-['Fraunces'] italic leading-relaxed" style={{ color: COLORS.secondary }}>
                "Traduzir o mundo invisível e sutil para expandir a consciência, unindo a ciência energética à autorresponsabilidade para refletir transformações reais e práticas na sua vida visível."
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: Atom, title: "Ciência do invisível", desc: "A energia é física. A radiônica e os campos eletromagnéticos são tratados com embasamento." },
              { icon: ShieldCheck, title: "Autorresponsabilidade", desc: "Facilitar e potencializar, mas a expansão exige vontade própria. Sem curas mágicas." },
              { icon: Sparkles, title: "Espontaneidade", desc: "Verdadeira, direta e com senso de urgência. Acolhe com firmeza, sem estereótipos zen." },
              { icon: Eye, title: "Visão Sistêmica", desc: "Ler as entrelinhas. Conectar cultura e histórias de vida para explicar padrões invisíveis." }
            ].map((pillar, idx) => (
              <div key={idx} className="p-6 border-2 transition-colors hover:bg-white/50" style={{ borderColor: COLORS.secondary }}>
                <pillar.icon size={32} className="mb-4" style={{ color: COLORS.primary }} />
                <Heading level={3} className="text-lg lg:text-xl mb-3" style={{ color: COLORS.secondary }}>
                  {pillar.title === "Autorresponsabilidade" ? (
                    <>Autorresponsa<wbr/>bilidade</>
                  ) : (
                    pillar.title
                  )}
                </Heading>
                <p className="text-sm leading-relaxed opacity-80">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 3. TOM DE VOZ */}
      <Section id="tom-de-voz" style={{ backgroundColor: COLORS.secondary, color: COLORS.background }}>
        <div className="text-center mb-16">
          <Heading className="text-4xl md:text-6xl mb-6">Tom de Voz</Heading>
          <p className="text-xl max-w-2xl mx-auto font-['Fraunces'] italic opacity-90">
            Firme, perspicaz e autêntica. Científica e questionadora.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 border-2" style={{ borderColor: COLORS.primaryAlt, backgroundColor: 'rgba(232, 168, 28, 0.05)' }}>
            <h3 className="text-2xl font-bold mb-4 font-['Fraunces'] flex items-center gap-3">
              <span className="p-2 rounded-full" style={{ backgroundColor: COLORS.primaryAlt, color: COLORS.secondary }}>✓</span> Como fala
            </h3>
            <ul className="space-y-4 text-lg opacity-90">
              <li className="flex items-start gap-3"><span style={{ color: COLORS.primaryAlt }}>■</span> Em tom de reflexão e ensaio.</li>
              <li className="flex items-start gap-3"><span style={{ color: COLORS.primaryAlt }}>■</span> Usa analogias com músicas, filmes e cultura.</li>
              <li className="flex items-start gap-3"><span style={{ color: COLORS.primaryAlt }}>■</span> Tem opinião forte: "Nenhum CNPJ pode ser maior que um CPF".</li>
            </ul>
          </div>
          <div className="p-8 border-2" style={{ borderColor: COLORS.accent, backgroundColor: 'rgba(154, 3, 30, 0.1)' }}>
            <h3 className="text-2xl font-bold mb-4 font-['Fraunces'] flex items-center gap-3">
              <span className="p-2 rounded-full" style={{ backgroundColor: COLORS.accent, color: COLORS.background }}>✕</span> Como não fala
            </h3>
            <ul className="space-y-4 text-lg opacity-90">
              <li className="flex items-start gap-3"><span style={{ color: COLORS.accent }}>■</span> Não usa linguagem esotérica clichê ("gratiluz").</li>
              <li className="flex items-start gap-3"><span style={{ color: COLORS.accent }}>■</span> Não terceiriza a responsabilidade ("vou te curar").</li>
              <li className="flex items-start gap-3"><span style={{ color: COLORS.accent }}>■</span> Não tenta forçar um positivismo tóxico.</li>
            </ul>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-white p-8 text-left" style={{ color: COLORS.text }}>
          <div className="flex items-center gap-4 mb-6">
            <BookOpen size={32} style={{ color: COLORS.primary }} />
            <Heading level={3} className="text-3xl">Diretrizes de Conteúdo</Heading>
          </div>
          <p className="text-lg mb-6">O conteúdo deve focar em desmistificar o campo sutil. Formatos principais:</p>
          <div className="flex flex-wrap gap-3 font-bold text-sm mb-6 uppercase">
            {["Tradução do Invisível", "Ciência do Sutil", "Choque de Autorresponsabilidade", "Lifestyle & Bastidores"].map(tag => (
              <span key={tag} className="px-3 py-1 border-2" style={{ borderColor: COLORS.secondary, color: COLORS.secondary }}>{tag}{tag.includes("Bastidores") ? "*" : ""}</span>
            ))}
          </div>
          <p className="text-sm opacity-80 border-l-4 pl-4 italic" style={{ borderColor: COLORS.accent }}>
            * Vetados: conteúdos vazios, "dancinhas" sem contexto ou promessas de cura. Bastidores devem ter estética retrô, misturando reflexões, arte, texturas, documentários e estudos.
          </p>
        </div>
      </Section>

      {/* 4. IDENTIDADE VISUAL - CORES */}
      <Section id="identidade-visual" className="relative min-h-screen flex flex-col justify-center">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
           <svg viewBox="0 0 100 100" className="w-full h-full fill-current" style={{ color: COLORS.accent }}>
             <circle cx="50" cy="50" r="40" />
           </svg>
        </div>
        
        <div className="mb-16">
          <Heading className="text-4xl md:text-6xl mb-4" style={{ color: COLORS.secondary }}>Identidade visual</Heading>
          <p className="text-xl font-['Fraunces'] italic" style={{ color: COLORS.primary }}>Maximalismo Vintage</p>
        </div>

        {/* Tabs: Cores vs Texturas */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveDesignTab("cores")}
            className={`px-6 py-2 font-bold font-['Fraunces'] text-lg border-2 transition-colors ${activeDesignTab === "cores" ? "bg-white" : "bg-transparent opacity-60 hover:opacity-100"}`}
            style={{ borderColor: COLORS.secondary, color: COLORS.secondary }}
          >
            Cores Sólidas
          </button>
          <button 
            onClick={() => setActiveDesignTab("texturas")}
            className={`px-6 py-2 font-bold font-['Fraunces'] text-lg border-2 transition-colors ${activeDesignTab === "texturas" ? "bg-white" : "bg-transparent opacity-60 hover:opacity-100"}`}
            style={{ borderColor: COLORS.secondary, color: COLORS.secondary }}
          >
            Texturas Analógicas
          </button>
        </div>

        {/* Tab Content */}
        {activeDesignTab === "cores" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: "Laranja Queimado", hex: COLORS.primary, role: "Primária / CTA" },
              { name: "Mostarda Vintage", hex: COLORS.primaryAlt, role: "Apoio Quente" },
              { name: "Azul Petróleo", hex: COLORS.secondary, role: "Fundos / Contraste" },
              { name: "Vermelho Cereja", hex: COLORS.accent, role: "Detalhes" }
            ].map((color) => (
              <div key={color.hex} className="group cursor-pointer">
                <div className="h-48 w-full mb-4 border-2 transition-transform group-hover:-translate-y-2 shadow-lg" style={{ backgroundColor: color.hex, borderColor: COLORS.text }}></div>
                <p className="font-bold font-['Fraunces'] text-xl">{color.name}</p>
                <p className="text-sm opacity-70 mb-2">{color.role}</p>
                <p className="text-sm font-mono bg-white/50 inline-block px-3 py-1 border border-black/10 font-bold">{color.hex}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full">
            {[
              { 
                name: "Ruído Analógico", 
                desc: "Granulação suave.",
                css: { backgroundColor: COLORS.primaryAlt, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.25\' mix-blend-mode=\'multiply\'/%3E%3C/svg%3E")' }
              },
              { 
                name: "Papel Vintage", 
                desc: "Fundo texturizado quente.",
                css: { backgroundColor: COLORS.background, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23n)\' opacity=\'0.15\' mix-blend-mode=\'multiply\'/%3E%3C/svg%3E")' }
              },
              { 
                name: "Meio-tom (Halftone)", 
                desc: "Retrô de impressão.",
                css: { backgroundColor: COLORS.secondary, backgroundImage: `radial-gradient(${COLORS.primaryAlt} 20%, transparent 20%)`, backgroundSize: '8px 8px', backgroundPosition: '0 0' }
              },
              { 
                name: "Grade Moleskine", 
                desc: "Grid de anotações.",
                css: { backgroundColor: COLORS.background, backgroundImage: `linear-gradient(${COLORS.secondary}22 1px, transparent 1px), linear-gradient(90deg, ${COLORS.secondary}22 1px, transparent 1px)`, backgroundSize: '16px 16px' }
              },
              { 
                name: "Listras Diagonais", 
                desc: "Dinâmica e contraste.",
                css: { backgroundColor: COLORS.primaryAlt, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${COLORS.accent}22 5px, ${COLORS.accent}22 10px)` }
              },
              { 
                name: "Ondas Psicodélicas", 
                desc: "Fluidez vibracional.",
                css: { backgroundColor: COLORS.accent, backgroundImage: `repeating-radial-gradient(circle at 0 0, transparent 0, transparent 10px, ${COLORS.background}11 10px, ${COLORS.background}11 20px)` }
              },
              { 
                name: "Poeira Estelar", 
                desc: "Sutileza pontilhada.",
                css: { backgroundColor: COLORS.secondary, backgroundImage: `radial-gradient(${COLORS.background}44 1px, transparent 1px)`, backgroundSize: '12px 12px', backgroundPosition: '0 0, 6px 6px' }
              },
              { 
                name: "Trama Têxtil", 
                desc: "Teia sutil geométrica.",
                css: { backgroundColor: COLORS.primary, backgroundImage: `repeating-linear-gradient(-45deg, #fff2, #fff2 2px, transparent 2px, transparent 8px)` }
              },
              { 
                name: "Xadrez Colagem", 
                desc: "Blocos de sobreposição.",
                css: { backgroundColor: COLORS.text, backgroundImage: `linear-gradient(45deg, ${COLORS.primary}44 25%, transparent 25%, transparent 75%, ${COLORS.primary}44 75%, ${COLORS.primary}44), linear-gradient(45deg, ${COLORS.primary}44 25%, transparent 25%, transparent 75%, ${COLORS.primary}44 75%, ${COLORS.primary}44)`, backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' }
              }
            ].map((texture, idx) => (
              <div key={idx} className="group cursor-pointer">
                <div className="h-56 lg:h-72 w-full mb-4 border-2 transition-transform group-hover:-translate-y-2 shadow-lg" style={{...texture.css, borderColor: COLORS.text}}></div>
                <p className="font-bold font-['Fraunces'] text-2xl">{texture.name}</p>
                <p className="text-sm opacity-80 mb-2">{texture.desc}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 4.1 IDENTIDADE VISUAL - TIPOGRAFIA */}
      <Section id="tipografia" className="relative border-t-4" style={{ borderColor: COLORS.secondary }}>
        <div className="max-w-4xl mx-auto">
          <Heading className="text-4xl md:text-6xl mb-12 text-center" style={{ color: COLORS.secondary }}>Tipografia</Heading>
          
          <div className="flex flex-col gap-12">
            {/* Fraunces */}
            <div className="p-8 border-2" style={{ borderColor: COLORS.primaryAlt, backgroundColor: 'rgba(232, 168, 28, 0.05)' }}>
              <p className="text-sm uppercase tracking-widest font-bold mb-4" style={{ color: COLORS.primary }}>Títulos</p>
              <p className="font-['Fraunces'] text-5xl md:text-6xl mb-6">Fraunces</p>
              <div className="font-['Fraunces'] text-xl md:text-2xl leading-loose mb-8 opacity-90 break-words tracking-widest">
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z <br />
                a b c d e f g h i j k l m n o p q r s t u v w x y z <br />
                0 1 2 3 4 5 6 7 8 9
              </div>
              <div className="border-t-2 pt-6" style={{ borderColor: 'rgba(232, 168, 28, 0.2)' }}>
                <p className="text-xs uppercase tracking-widest font-bold mb-3 opacity-60">Exemplo de aplicação</p>
                <p className="font-['Fraunces'] text-3xl md:text-4xl leading-tight">Fonte serifada robusta com personalidade vintage e editorial. Traz o peso das antigas publicações e autoridade.</p>
              </div>
            </div>
            
            {/* Inter */}
            <div className="p-8 border-2" style={{ borderColor: COLORS.secondary, backgroundColor: 'rgba(15, 76, 92, 0.05)' }}>
              <p className="text-sm uppercase tracking-widest font-bold mb-4" style={{ color: COLORS.primary }}>Parágrafos</p>
              <p className="font-['Inter'] font-bold text-5xl md:text-6xl mb-6">Inter</p>
              <div className="font-['Inter'] text-lg md:text-xl leading-loose mb-8 opacity-90 break-words tracking-widest">
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z <br />
                a b c d e f g h i j k l m n o p q r s t u v w x y z <br />
                0 1 2 3 4 5 6 7 8 9
              </div>
              <div className="border-t-2 pt-6" style={{ borderColor: 'rgba(15, 76, 92, 0.2)' }}>
                <p className="text-xs uppercase tracking-widest font-bold mb-3 opacity-60">Exemplo de aplicação</p>
                <p className="font-['Inter'] text-lg leading-relaxed">
                  Sans-serif limpa e geométrica. Equilibra o maximalismo visual e garante uma leitura fluida.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 4.2 IDENTIDADE VISUAL - LOGOTIPO */}
      <Section id="logotipo" className="relative border-t-4" style={{ borderColor: COLORS.secondary }}>
        <div className="max-w-4xl mx-auto">
          <Heading className="text-4xl md:text-6xl mb-12 text-center" style={{ color: COLORS.secondary }}>Logotipo</Heading>
          
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 w-full p-8 border-2 flex items-center justify-center bg-[#EBE3D5]" style={{ borderColor: COLORS.primaryAlt }}>
               <ImageWithFallback src={logoImage} alt="Símbolo Cláudia Tambelini" className="w-64 h-64 object-contain mix-blend-multiply" />
            </div>
            
            <div className="flex-1">
              <Heading level={3} className="text-3xl mb-6" style={{ color: COLORS.secondary }}>O Símbolo Central</Heading>
              <p className="text-lg opacity-80 leading-relaxed mb-6 font-['Inter']">O logotipo é um nó celta de quatro elementos entrelaçados. Este símbolo foi sonhado pela profissional e desenvolvido com base em um estudo de significados.</p>
              <ul className="space-y-4">
                <li className="flex gap-4 items-start">
                  <span className="mt-1" style={{ color: COLORS.primary }}>■</span>
                  <span className="opacity-90">Representa a continuidade e a eternidade.</span>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="mt-1" style={{ color: COLORS.primary }}>■</span>
                  <span className="opacity-90">Simboliza a interconectividade de todas as coisas.</span>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="mt-1" style={{ color: COLORS.primary }}>■</span>
                  <span className="opacity-90">Ilustra o fluxo perpétuo entre os mundos visível e invisível.</span>
                </li>
              </ul>
              <p className="text-xl font-['Fraunces'] italic mt-8" style={{ color: COLORS.primaryAlt }}>A âncora visual da promessa.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* 4.3 IDENTIDADE VISUAL - FOTOGRAFIA */}
      <Section id="fotografia" className="relative border-t-4" style={{ borderColor: COLORS.secondary, backgroundColor: COLORS.secondary, color: COLORS.background }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <Heading className="text-4xl md:text-5xl mb-6">Direção Fotográfica</Heading>
              <p className="text-xl font-['Fraunces'] italic opacity-90 mb-8">O rosto é a vitrine.</p>
              
              <ul className="space-y-6 text-lg">
                <li className="flex gap-4 items-start">
                  <span className="mt-1" style={{ color: COLORS.primaryAlt }}>■</span> 
                  <div>
                    <strong>Colorimetria Quente</strong>
                    <p className="opacity-80 text-sm mt-1">Tons quentes com texturas que remetam ao analógico ou estilo de colagem.</p>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="mt-1" style={{ color: COLORS.primaryAlt }}>■</span> 
                  <div>
                    <strong>Alto Contraste</strong>
                    <p className="opacity-80 text-sm mt-1">Contraste marcado, fugindo totalmente do visual super iluminado e artificial.</p>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="mt-1" style={{ color: COLORS.primaryAlt }}>■</span> 
                  <div>
                    <strong>Expressão Perspicaz</strong>
                    <p className="opacity-80 text-sm mt-1">Poses espontâneas capturando olhares profundos, sem sorrisos engessados de banco de imagens.</p>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="mt-1" style={{ color: COLORS.primaryAlt }}>■</span> 
                  <div>
                    <strong>Cenário e Composição</strong>
                    <p className="opacity-80 text-sm mt-1">Ambientes autênticos e vivos, com elementos de estudos, livros e texturas. Fuga total do clássico "consultório branco minimalista".</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="flex-1 w-full relative">
              <div className="absolute inset-0 translate-x-4 translate-y-4 border-2 pointer-events-none" style={{ borderColor: COLORS.primaryAlt }}></div>
              <div className="relative z-10 bg-white p-3 border-2" style={{ borderColor: COLORS.background }}>
                <ImageWithFallback 
                  src={photoImage} 
                  alt="Direção Fotográfica - Cláudia Tambelini"
                  className="w-full h-auto object-cover grayscale-[15%] contrast-[1.1] sepia-[10%]"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 5. APLICAÇÕES PRÁTICAS - REDES SOCIAIS */}
      <Section id="redes-sociais" className="min-h-screen flex flex-col justify-center" style={{ backgroundColor: COLORS.accent, color: COLORS.background }}>
        <div className="mb-16">
          <p className="text-xl font-['Fraunces'] italic mb-4" style={{ color: COLORS.primaryAlt }}>Aplicações Práticas</p>
          <Heading className="text-4xl md:text-7xl mb-4">Redes Sociais</Heading>
          <p className="text-lg opacity-90 max-w-2xl border-l-4 pl-4" style={{ borderColor: COLORS.primaryAlt }}>
            O foco principal da comunicação. É aqui que o maximalismo vintage e a tradução do invisível encontram o público diariamente.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
          {/* Feed */}
          <div className="bg-white p-10 border-4 shadow-xl transition-transform hover:-translate-y-2 flex flex-col" style={{ borderColor: COLORS.background, color: COLORS.text }}>
            <Layers size={48} className="mb-6" style={{ color: COLORS.primary }} />
            <Heading level={3} className="text-3xl mb-8 border-b-2 pb-4 inline-block" style={{ borderColor: COLORS.secondary }}>Feed</Heading>
            <ul className="space-y-6 text-lg opacity-90 flex-1">
              <li className="flex items-start gap-4">
                <span className="mt-1" style={{ color: COLORS.primary }}>■</span> 
                <div>
                  <strong>Estética de colagem digital</strong>
                  <p className="text-sm mt-1 opacity-80">Inspirada no estilo da Zoe Dorey. Mistura orgânica de elementos.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1" style={{ color: COLORS.primary }}>■</span> 
                <div>
                  <strong>Texturas e Recortes</strong>
                  <p className="text-sm mt-1 opacity-80">Uso intenso das texturas analógicas (papel, ruído, retícula) como base e elementos recortados.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1" style={{ color: COLORS.primary }}>■</span> 
                <div>
                  <strong>Tipografia Marcante</strong>
                  <p className="text-sm mt-1 opacity-80">Textos curtos e impactantes utilizando a família Fraunces misturada com a Inter.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Reels */}
          <div className="bg-white p-10 border-4 shadow-xl transition-transform hover:-translate-y-2 flex flex-col" style={{ borderColor: COLORS.background, color: COLORS.text }}>
            <Layout size={48} className="mb-6" style={{ color: COLORS.primary }} />
            <Heading level={3} className="text-3xl mb-8 border-b-2 pb-4 inline-block" style={{ borderColor: COLORS.secondary }}>Capas de Reels</Heading>
            <ul className="space-y-6 text-lg opacity-90 flex-1">
              <li className="flex items-start gap-4">
                <span className="mt-1" style={{ color: COLORS.primary }}>■</span> 
                <div>
                  <strong>Títulos Instigantes</strong>
                  <p className="text-sm mt-1 opacity-80">Frases que geram curiosidade com a fonte serifada em grande destaque.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1" style={{ color: COLORS.primary }}>■</span> 
                <div>
                  <strong>Paleta Quente ao Fundo</strong>
                  <p className="text-sm mt-1 opacity-80">Aplicação rigorosa do Laranja Queimado ou Mostarda Vintage como base para não passar despercebido.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1" style={{ color: COLORS.primary }}>■</span> 
                <div>
                  <strong>Padrão Reconhecível</strong>
                  <p className="text-sm mt-1 opacity-80">Criação de um visual repetível e rápido de absorver para o formato de "comentário/reflexão".</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* PREVIEW DO FEED E REELS */}
      <Section className="border-t-4 py-24" style={{ borderColor: COLORS.secondary, backgroundColor: '#FAFAFA', color: '#000' }}>
        <div className="max-w-6xl mx-auto mb-12 text-center">
          <Heading className="text-4xl md:text-5xl mb-4" style={{ color: COLORS.secondary }}>O Feed na Prática</Heading>
          <p className="text-lg opacity-80 font-['Inter'] max-w-2xl mx-auto">
            Simulação da interface do Instagram aplicando a estética de colagem digital, mix de tipografias e texturas analógicas, ao lado de um exemplo realístico de capa de Reels.
          </p>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
          
          {/* Mockup Instagram Profile (Feed) */}
          <div className="w-full lg:w-2/3 bg-white border shadow-2xl rounded-3xl overflow-hidden font-['Inter']">
            
            {/* Header Instagram */}
            <div className="flex items-center gap-4 md:gap-8 p-6 border-b">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-1 border-2 flex-shrink-0" style={{ borderColor: COLORS.primary }}>
                <div className="w-full h-full rounded-full overflow-hidden">
                  <ImageWithFallback src={photoImage} alt="Profile" className="w-full h-full object-cover" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                  <h2 className="text-xl font-semibold">aclaudiatambelini</h2>
                  <div className="flex gap-2">
                    <button className="bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors">Seguindo</button>
                    <button className="bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors">Mensagem</button>
                  </div>
                </div>
                
                <div className="hidden md:flex gap-6 mb-3 text-sm">
                  <p><strong className="font-semibold">342</strong> publicações</p>
                  <p><strong className="font-semibold">12,4 mil</strong> seguidores</p>
                  <p><strong className="font-semibold">890</strong> seguindo</p>
                </div>
                
                <div className="text-sm">
                  <p className="font-bold">Cláudia Tambelini</p>
                  <p className="opacity-90 text-gray-800 whitespace-pre-line leading-snug">
                    A Intérprete do invisível. 👁️✨
                    Ciência energética & Autorresponsabilidade.
                  </p>
                </div>
              </div>
            </div>

            {/* Abas Feed/Reels */}
            <div className="flex justify-center border-b">
              <div className="flex items-center gap-2 px-8 py-3 border-t-2 border-black -mt-[1px] font-semibold text-xs tracking-widest uppercase">
                <Layers size={14} /> Publicações
              </div>
              <div className="flex items-center gap-2 px-8 py-3 text-gray-400 font-semibold text-xs tracking-widest uppercase">
                <Layout size={14} /> Reels
              </div>
            </div>

            {/* Grid de Posts */}
            <div className="grid grid-cols-3 gap-1">
              
              {/* Post 1 - Colagem Texturizada */}
              <div className="aspect-square relative overflow-hidden bg-[#0F4C5C] group cursor-pointer">
                <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}></div>
                <ImageWithFallback src={photoImage} className="absolute -right-4 -bottom-4 w-3/4 h-3/4 object-cover mix-blend-luminosity opacity-70 grayscale sepia" />
                <div className="absolute inset-0 p-3 md:p-6 flex flex-col justify-start items-start">
                  <div className="bg-[#EBE3D5] px-2 py-1 rotate-[-3deg] shadow-lg mb-1">
                    <p className="font-['Fraunces'] italic text-[#D95C14] text-xs md:text-sm leading-none">A ciência</p>
                  </div>
                  <div className="bg-[#EBE3D5] px-2 py-1 rotate-[1deg] shadow-lg">
                    <p className="font-['Fraunces'] font-bold text-[#0F4C5C] text-sm md:text-base leading-none">do invisível.</p>
                  </div>
                </div>
              </div>

              {/* Post 2 - Choque / Typographic */}
              <div className="aspect-square relative overflow-hidden bg-[#EBE3D5] p-3 flex items-center justify-center group cursor-pointer border border-gray-100">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(${COLORS.secondary} 20%, transparent 20%)`, backgroundSize: '6px 6px' }}></div>
                <div className="relative z-10 text-center">
                  <p className="font-['Inter'] font-black text-[#D95C14] text-[8px] md:text-xs tracking-widest uppercase mb-1">Lembrete</p>
                  <p className="font-['Fraunces'] text-[#0F4C5C] text-sm md:text-lg leading-tight">Nenhum CNPJ pode ser maior que um CPF.</p>
                </div>
              </div>

              {/* Post 3 - Foto / Bastidores Quente */}
              <div className="aspect-square relative overflow-hidden bg-[#D95C14] group cursor-pointer">
                <ImageWithFallback src={photoImage} className="w-full h-full object-cover mix-blend-multiply grayscale-[20%] opacity-80" />
                <div className="absolute inset-0 border-[3px] md:border-[6px] border-[#E8A81C]/20 m-2 md:m-3 pointer-events-none"></div>
                <div className="absolute bottom-2 left-2 bg-[#9A031E] px-2 py-0.5">
                  <p className="font-['Inter'] text-white font-bold text-[8px] md:text-[10px] uppercase tracking-widest">Bastidores</p>
                </div>
              </div>

              {/* Post 4 - Papel Rasgado / Colagem */}
              <div className="aspect-square relative overflow-hidden bg-[#9A031E] group cursor-pointer flex items-center justify-center p-3">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}></div>
                <div className="w-full h-[80%] bg-[#EBE3D5] rotate-2 shadow-xl flex items-center justify-center p-2">
                  <p className="font-['Fraunces'] text-[#9A031E] text-center text-sm md:text-xl italic leading-tight rotate-[-2deg]">Ler as<br/>entrelinhas.</p>
                </div>
              </div>

              {/* Post 5 - Grafismo / Citação */}
              <div className="aspect-square relative overflow-hidden bg-[#E8A81C] group cursor-pointer p-4 flex flex-col justify-between">
                <div className="absolute right-[-20%] top-[-20%] w-[80%] h-[80%] rounded-full border-4 border-[#0F4C5C] opacity-20"></div>
                <Quote className="text-[#0F4C5C] w-6 h-6 opacity-40" />
                <p className="font-['Inter'] font-bold text-[#0F4C5C] text-[10px] md:text-sm leading-tight">A energia não é misticismo e esoterismo, é física.</p>
              </div>

              {/* Post 6 - Imagem com filtro Analógico */}
              <div className="aspect-square relative overflow-hidden bg-[#0F4C5C] group cursor-pointer">
                <ImageWithFallback src={brandImage} className="absolute inset-0 w-full h-full object-cover opacity-50 sepia mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F4C5C] via-transparent to-transparent opacity-90"></div>
                <p className="absolute bottom-3 left-3 font-['Fraunces'] text-white text-sm md:text-lg leading-none">Visão<br/><span className="italic text-[#E8A81C]">Sistêmica</span></p>
              </div>

            </div>
          </div>

          {/* Mockup Capa de Reels */}
          <div className="w-full max-w-sm lg:w-1/3 flex flex-col items-center">
             <div className="w-full aspect-[9/16] bg-[#D95C14] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col p-6 text-white" style={{ backgroundColor: COLORS.primary }}>
               {/* Fundo Tratado */}
               <ImageWithFallback src={photoImage} className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-60 grayscale-[40%] contrast-125" />
               <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}></div>
               <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>
               
               {/* Top UI */}
               <div className="relative z-10 flex justify-between items-center w-full mb-auto opacity-80 pt-2">
                 <div className="w-6 h-6 rounded-full border-2 border-white/50 overflow-hidden">
                   <ImageWithFallback src={photoImage} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                 </div>
               </div>

               {/* Título Centralizado do Reels */}
               <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center">
                 <div className="bg-[#EBE3D5] text-[#9A031E] px-4 py-2 rotate-[-2deg] shadow-2xl border border-white/20 mb-4">
                   <Heading level={3} className="text-4xl md:text-5xl leading-none italic">A ciência</Heading>
                 </div>
                 <Heading level={3} className="text-5xl md:text-6xl text-white shadow-black drop-shadow-xl">do sutil.</Heading>
               </div>

               {/* Bottom UI */}
               <div className="relative z-10 w-full mt-auto pb-2 flex justify-between items-end">
                 <div className="flex flex-col gap-2">
                   <p className="font-['Inter'] font-semibold text-sm drop-shadow-md">claudiatambelini</p>
                   <p className="font-['Inter'] text-xs font-light opacity-90 truncate max-w-[200px]">Desmistificando o invisível e trazendo para a prática.</p>
                 </div>
                 <div className="flex flex-col gap-4 items-center">
                   <div className="w-8 h-8 flex flex-col items-center gap-1 opacity-90"><svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span className="text-[10px] font-semibold">1,2k</span></div>
                   <div className="w-8 h-8 flex flex-col items-center gap-1 opacity-90"><MessageSquare size={24} className="text-white" fill="white" fillOpacity={0.2} /><span className="text-[10px] font-semibold">45</span></div>
                 </div>
               </div>
             </div>
             
             <p className="mt-6 text-center font-bold font-['Fraunces'] text-xl" style={{ color: COLORS.secondary }}>Exemplo: Capa de Reels</p>
             <p className="text-sm opacity-70 text-center max-w-xs mt-2">Formato vertical 9:16. Uso da paleta quente de fundo para prender a atenção e títulos impactantes.</p>
          </div>

        </div>
      </Section>

      {/* 5.1 OUTROS TOUCHPOINTS */}
      <Section id="touchpoints" style={{ backgroundColor: COLORS.secondary, color: COLORS.background }}>
        <Heading className="text-3xl md:text-5xl mb-12 text-center">Touchpoints Complementares</Heading>
        
        <div className="flex flex-col gap-16">
          {/* Landing Pages */}
          <div className="flex flex-col lg:flex-row gap-8 items-stretch">
            <div className="flex-1 p-8 border-2 bg-black/10 flex flex-col justify-center" style={{ borderColor: COLORS.primaryAlt }}>
              <Layout size={40} className="mb-6" style={{ color: COLORS.primaryAlt }} />
              <Heading level={4} className="text-3xl mb-4 text-white">Touchpoints Digitais</Heading>
              <p className="text-lg opacity-80 leading-relaxed mb-6">
                A riqueza do design maximalista precisa ser aplicada no cabeçalho e nos fundos das seções (usando texturas). A área do formulário deve ser extremamente objetiva para não prejudicar a conversão. Botões de agendamento usando <strong>exclusivamente</strong> Laranja Queimado ou Mostarda para guiar a ação do usuário de forma clara.
              </p>
            </div>
            
            {/* Landing Page Preview Mockup */}
            <div className="flex-1 border-4 bg-[#EBE3D5] rounded-xl overflow-hidden shadow-2xl flex flex-col relative" style={{ borderColor: COLORS.primaryAlt }}>
               {/* Browser bar */}
               <div className="h-6 bg-white border-b border-gray-300 flex items-center px-3 gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
               </div>
               {/* Hero Section of LP */}
               <div className="relative p-6 md:p-8 flex flex-col items-center text-center border-b-2" style={{ backgroundColor: COLORS.secondary, borderColor: COLORS.primaryAlt }}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}></div>
                  <h3 className="relative z-10 font-['Fraunces'] text-white text-2xl md:text-3xl leading-tight mb-3">Expanda sua consciência.</h3>
                  <p className="relative z-10 text-white/80 text-xs md:text-sm max-w-xs mb-6 font-['Inter']">Traduza o mundo invisível e sutil com embasamento científico e autorresponsabilidade.</p>
               </div>
               {/* Form Section of LP */}
               <div className="bg-[#EBE3D5] p-6 flex flex-col items-center relative flex-1">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(${COLORS.secondary} 20%, transparent 20%)`, backgroundSize: '6px 6px' }}></div>
                  <div className="relative z-10 bg-white p-5 border shadow-md w-full max-w-sm">
                    <p className="font-bold font-['Inter'] text-sm mb-4 text-center" style={{ color: COLORS.text }}>Agende sua sessão</p>
                    <div className="h-8 bg-gray-100 border border-gray-200 mb-3 w-full"></div>
                    <div className="h-8 bg-gray-100 border border-gray-200 mb-4 w-full"></div>
                    <button className="w-full py-2 font-bold font-['Inter'] text-white text-sm" style={{ backgroundColor: COLORS.primary }}>Garantir Horário</button>
                  </div>
               </div>
            </div>
          </div>

          {/* Documentação */}
          <div className="flex flex-col lg:flex-row-reverse gap-8 items-stretch mt-4">
            <div className="flex-1 p-8 border-2 bg-black/10 flex flex-col justify-center" style={{ borderColor: COLORS.primaryAlt }}>
              <MessageSquare size={40} className="mb-6" style={{ color: COLORS.primaryAlt }} />
              <Heading level={4} className="text-3xl mb-4 text-white">Documentação e Relatórios</Heading>
              <p className="text-lg opacity-80 leading-relaxed">
                A autoridade se mantém no pós-venda. O estilo deve ser 'científico e embasado'. PDFs de acompanhamento, propostas comerciais e materiais educativos devem padronizar cabeçalhos com Azul Petróleo e títulos em fontes serifadas, eliminando a formatação padrão do sistema para garantir uma experiência 100% no ecossistema da marca.
              </p>
            </div>

            {/* Documentation Preview Mockup - E-Book/Guia */}
            <div className="flex-1 border-4 bg-[#EBE3D5] rounded-xl overflow-hidden shadow-2xl flex flex-col relative" style={{ borderColor: COLORS.primaryAlt }}>
               {/* Capa/Cabeçalho do E-book */}
               <div className="bg-[#0F4C5C] px-8 py-10 text-white relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${COLORS.primaryAlt} 5px, ${COLORS.primaryAlt} 10px)` }}></div>
                 <div className="relative z-10 flex flex-col items-start gap-4">
                   <div className="bg-[#D95C14] text-white font-['Inter'] font-bold text-[10px] uppercase tracking-widest px-3 py-1 mb-2">
                     Material Educativo
                   </div>
                   <h3 className="font-['Fraunces'] text-3xl md:text-4xl leading-tight">A Física do Campo Sutil</h3>
                   <p className="font-['Inter'] text-sm opacity-80 max-w-[280px]">Como os campos eletromagnéticos influenciam os padrões invisíveis da sua rotina.</p>
                 </div>
               </div>
               
               {/* Corpo do E-book */}
               <div className="p-8 flex-1 flex flex-col gap-6 bg-white border-t-8" style={{ color: COLORS.text, borderColor: COLORS.primaryAlt }}>
                 <div className="flex gap-6 items-start">
                   <div className="w-12 h-12 flex-shrink-0 bg-[#E8A81C] rounded-full flex items-center justify-center font-['Fraunces'] text-2xl text-[#0F4C5C] font-bold">1</div>
                   <div>
                     <h4 className="font-['Fraunces'] text-xl mb-2" style={{ color: COLORS.secondary }}>A ilusão do misticismo</h4>
                     <p className="font-['Inter'] text-sm leading-relaxed opacity-90">
                       A energia sempre foi tratada como algo esotérico. No entanto, a radiônica comprova que somos frequências. O primeiro passo para o pragmatismo energético é...
                     </p>
                   </div>
                 </div>

                 <div className="flex gap-6 items-start opacity-40">
                   <div className="w-12 h-12 flex-shrink-0 border-2 border-gray-300 rounded-full flex items-center justify-center font-['Fraunces'] text-xl text-gray-400">2</div>
                   <div className="w-full pt-2">
                     <div className="w-[80%] h-3 bg-gray-200 rounded-sm mb-3"></div>
                     <div className="w-[60%] h-3 bg-gray-200 rounded-sm mb-3"></div>
                     <div className="w-[90%] h-3 bg-gray-200 rounded-sm"></div>
                   </div>
                 </div>
                 
                 <div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center opacity-40">
                   <p className="font-['Inter'] text-[10px] font-bold">Por Cláudia Tambelini</p>
                   <p className="font-['Inter'] text-[10px]">Pág 1/12</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="py-12 text-center" style={{ backgroundColor: COLORS.secondary, color: COLORS.background }}>
        <p className="font-['Fraunces'] text-xl italic mb-4">A Intérprete do invisível</p>
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-xs opacity-60 uppercase tracking-widest font-bold">Brandbook © 2026</p>
          <p className="text-[10px] opacity-40 uppercase tracking-widest font-medium">Estratégia e Design: Agência LOTS</p>
        </div>
      </footer>
    </div>
  );
}
