import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';

import { db, storage } from '../lib/firebase';
import { Order, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Send, Upload, Copy, Check, CreditCard, ChefHat, Truck, CheckCircle, XCircle, Clock, AlertCircle, Printer, ChevronLeft } from 'lucide-react';
import { playNotificationSound } from '../lib/audio';
import { AnimatePresence, motion } from 'framer-motion';

const statusMap = {
  pending_payment: 'Aguardando Pagamento',
  preparing: 'Preparando',
  delivering: 'Em Entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

const getStepsForOrder = (order: Order | null) => {
  const method = order?.paymentMethod || 'pix';
  let paymentLabel = 'Pagamento';
  let paymentDesc = 'Aguardando PIX';
  
  if (method === 'credit') {
    paymentLabel = 'Cartão';
    paymentDesc = 'Crédito na Entrega';
  } else if (method === 'debit') {
    paymentLabel = 'Cartão';
    paymentDesc = 'Débito na Entrega';
  } else if (method === 'cash') {
    paymentLabel = 'Dinheiro';
    paymentDesc = order?.changeRequested ? 'Dinheiro (c/ troco)' : 'Dinheiro na Entrega';
  }

  return [
    { id: 'pending_payment', label: paymentLabel, desc: paymentDesc, icon: CreditCard },
    { id: 'preparing', label: 'Preparo', desc: 'Na cozinha', icon: ChefHat },
    { id: 'delivering', label: 'Entrega', desc: 'A caminho', icon: Truck },
    { id: 'completed', label: 'Entregue', desc: 'Bom apetite!', icon: CheckCircle }
  ];
};

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: "Irmãos Pilar",
    phone: "21 99999-9999",
    address: "Avenida Prefeito José Amorim, Nº 500, Jardim Meriti, São João de Meriti - RJ",
    pixKey: "12.345.678/0001-90",
    pixKeyName: "Irmãos Pilar Ltda"
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrinterSize, setSelectedPrinterSize] = useState<'80mm' | '58mm'>('80mm');
  const [printType, setPrintType] = useState<'delivery' | 'kitchen' | 'both'>('delivery');

  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    submessage?: string;
  } | null>(null);

  useEffect(() => {
    // Se o usuário acessar o link direto (ex: via notificação) e não tiver histórico,
    // injetamos a página pai no histórico para que o botão de voltar nativo funcione
    if (window.history.length <= 2) {
      const parentUrl = user?.role === 'admin' ? '/admin' : '/orders';
      window.history.replaceState(null, '', parentUrl);
      window.history.pushState(null, '', window.location.href);
    }
  }, [user]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  useEffect(() => {
    // Escuta os dados da empresa do Firestore
    const unsubCompany = onSnapshot(doc(db, 'settings', 'company_info'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCompanyInfo(prev => ({
          ...prev,
          ...data
        }));
      }
    });
    return () => unsubCompany();
  }, []);

  useEffect(() => {
    if (!id) return;
    
    // Listen to Order in real-time
    const orderRef = doc(db, 'orders', id);
    const unsubscribeOrder = onSnapshot(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        const newOrderData = { id: snapshot.id, ...snapshot.data() } as Order;
        setOrder(prevOrder => {
          // Play status change sound if the status actually changed
          if (prevOrder && prevOrder.status !== newOrderData.status) {
            playNotificationSound('status_change');
          }
          return newOrderData;
        });
      }
    });

    // Listen to messages in real-time
    const q = query(collection(db, 'orders', id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);

      // Only play sound if message was added by someone else and is fresh (last 10 seconds)
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msgData = change.doc.data() as ChatMessage;
          if (msgData && msgData.senderId !== user?.uid && (Date.now() - msgData.createdAt < 10000)) {
            playNotificationSound('new_message');
          }
        }
      });
    });

    return () => {
      unsubscribeOrder();
      unsubscribeMessages();
    };
  }, [id, user?.uid]);

  // Helper to compress images on the client side before upload (prevents huge documents & F12 / quota errors)
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const base64ToBlob = (base64: string): Blob => {
    try {
      const parts = base64.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
      console.error('Error converting base64 to blob:', e);
      return new Blob([], { type: 'image/jpeg' });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;
    if (!user || !id) return;
    
    const textToSend = newMessage.trim();
    const imageToUpload = selectedImage;

    // Limpa os campos do formulário IMEDIATAMENTE para a UI ficar livre e responsiva
    setNewMessage('');
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
      setSelectedImage(null);
    }
    
    const uploadAndSend = async () => {
      setUploading(true);
      try {
        let imageUrl = '';
        
        if (imageToUpload) {
          try {
            imageUrl = await compressImage(imageToUpload.file);
          } catch (compErr) {
            console.error('Error compressing image:', compErr);
            setAlert({
              type: 'error',
              message: 'Erro ao processar imagem',
              submessage: 'Não foi possível otimizar o arquivo.'
            });
            setUploading(false);
            return;
          }
        }

        setUploading(false);

        // Salva no banco de forma assíncrona
        addDoc(collection(db, 'orders', id, 'messages'), {
          senderId: user.uid,
          senderName: user.name,
          text: textToSend || 'Envio de comprovante/imagem',
          ...(imageUrl ? { imageUrl } : {}),
          createdAt: Date.now()
        }).catch(err => {
          console.error('Erro assíncrono ao salvar mensagem:', err);
        });

        if (imageUrl && order?.status === 'pending_payment') {
          updateDoc(doc(db, 'orders', id), {
            receiptUrl: imageUrl
          }).catch(err => {
            console.error('Erro assíncrono ao vincular comprovante:', err);
          });
        }
      } catch (err) {
        console.error('Error sending message:', err);
        setAlert({
          type: 'error',
          message: 'Erro ao enviar',
          submessage: 'Houve uma falha ao enviar sua mensagem.'
        });
        setUploading(false);
      }
    };
    
    uploadAndSend();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setSelectedImage({ file, previewUrl });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStatusChange = async (newStatus: Order['status']) => {
    if (!id || !order) return;
    
    // Prevent redundant clicks
    if (order.status === newStatus) return;

    const statusLabels: Record<string, string> = {
      preparing: 'Aprovar e Preparar',
      delivering: 'Marcar como Em Entrega',
      completed: 'Marcar como Concluído',
      cancelled: 'Cancelar Pedido'
    };

    if (!window.confirm(`Deseja alterar o status para "${statusLabels[newStatus]}"?`)) {
      return;
    }

    setUploading(true); // Reuse uploading state to prevent multiple clicks
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus, updatedAt: Date.now() });
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);

      // Enviar mensagem automática amigável no chat
      let systemMessage = '';
      if (newStatus === 'preparing') {
        systemMessage = '🍳 Seu pedido foi aprovado e já está em preparação na nossa cozinha! Nosso prazo de preparo é de até 30 minutos. Logo seu pedido sairá quentinho para você!';
      } else if (newStatus === 'delivering') {
        systemMessage = '🚀 Boas notícias! Seu pedido foi finalizado e já saiu para entrega. Nosso prazo de entrega é de até 20 minutos!';
      } else if (newStatus === 'completed') {
        systemMessage = '🎉 Seu pedido foi entregue! Esperamos que aprecie cada pedaço. Muito obrigado pela preferência e bom apetite! 🍔🍟';
      } else if (newStatus === 'cancelled') {
        systemMessage = '⚠️ Seu pedido foi cancelado pelo estabelecimento. Caso tenha dúvidas ou precise de suporte, envie-nos uma mensagem por aqui.';
      }

      if (systemMessage) {
        await addDoc(collection(db, 'orders', id, 'messages'), {
          senderId: 'system',
          senderName: companyInfo.name || 'Estabelecimento',
          text: systemMessage,
          createdAt: Date.now()
        });
      }
      
      setAlert({
        type: 'success',
        message: 'Status atualizado',
        submessage: `O pedido agora está: ${statusMap[newStatus]}`
      });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setAlert({
        type: 'error',
        message: 'Erro ao atualizar',
        submessage: 'Houve uma falha técnica ao mudar o status.'
      });
    } finally {
      setUploading(false);
    }
  };

  const copyPix = () => {
    navigator.clipboard.writeText(companyInfo.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatePrintHTML = (size: '80mm' | '58mm', type: 'delivery' | 'kitchen') => {
    if (!order) return '';
    const width = size === '80mm' ? '302px' : '219px';
    const isKitchen = type === 'kitchen';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { margin: 0; }
            body { 
              width: ${width}; 
              margin: 0; 
              padding: 10px; 
              font-family: 'Courier New', Courier, monospace; 
              font-size: ${size === '80mm' ? '14px' : '12px'};
              line-height: 1.2;
              color: black;
            }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px; }
            .title { font-weight: bold; font-size: 1.2em; text-transform: uppercase; }
            .section { margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 5px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .item-details { padding-left: 10px; font-size: 0.9em; font-style: italic; }
            .total-section { font-weight: bold; font-size: 1.1em; text-align: right; }
            .footer { text-align: center; margin-top: 15px; font-size: 0.8em; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 0.85em; }
            .divider { border-top: 1px dashed black; margin: 5px 0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="title">${companyInfo.name || 'IRMAOS PILAR'}</div>
            <div style="font-size: 0.9em; margin-top: 5px;">PEDIDO #${order.id.slice(-6).toUpperCase()}</div>
            <div style="font-size: 0.8em;">${format(order.createdAt, 'dd/MM/yyyy HH:mm')}</div>
          </div>

          ${!isKitchen ? `
          <div class="section">
            <div class="label">Cliente:</div>
            <div>${order.userName}</div>
          </div>

          <div class="section">
            <div class="label">Endereço de Entrega:</div>
            <div>${order.address || 'Não informado'}</div>
          </div>
          ` : `
          <div class="section" style="text-align: center; background: #eee; padding: 5px;">
            <div class="title">COZINHA / PRODUÇÃO</div>
          </div>
          `}

          <div class="section">
            <div class="label" style="margin-bottom: 5px;">Itens do Pedido:</div>
            ${order.items.map(item => `
              <div class="item">
                <span>${item.quantity}x ${item.product.name}</span>
                ${!isKitchen ? `<span>${formatCurrency(item.totalPrice)}</span>` : ''}
              </div>
              ${item.selectedOption ? `<div class="item-details">- Opção: ${item.selectedOption}</div>` : ''}
              ${item.selectedSize ? `<div class="item-details">- Tamanho: ${item.selectedSize}</div>` : ''}
              <div class="divider"></div>
            `).join('')}
          </div>

          ${!isKitchen ? `
          <div class="total-section">
            <div class="item">
              <span>SUBTOTAL:</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
            <div class="item">
              <span>TOTAL:</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          <div class="section">
            <div class="label">Pagamento:</div>
            <div style="font-weight: bold; margin-top: 2px;">
              ${order.status === 'completed' || (order.paymentMethod === 'pix' && order.status !== 'pending_payment') 
                ? 'PAGO' 
                : 'AGUARDANDO PAGAMENTO'}
            </div>
            <div style="font-size: 0.9em; margin-top: 2px;">
              FORMA: ${{
                pix: 'PIX',
                credit: 'CARTÃO DE CRÉDITO (NA ENTREGA)',
                debit: 'CARTÃO DE DÉBITO (NA ENTREGA)',
                cash: 'DINHEIRO'
              }[order.paymentMethod] || order.paymentMethod.toUpperCase()}
            </div>
            ${order.paymentMethod === 'cash' && order.changeRequested ? `
              <div style="font-weight: bold; color: black; margin-top: 2px; border: 1px solid black; padding: 2px; text-align: center;">
                TROCO PARA: ${formatCurrency(order.changeFor || 0)}
              </div>
            ` : ''}
            
            ${order.notes ? `
              <div class="label" style="margin-top: 8px;">Observações:</div>
              <div style="font-size: 0.9em;">${order.notes}</div>
            ` : ''}
          </div>
          ` : ''}

          <div class="footer">
            ${isKitchen ? '--- BOM TRABALHO ---' : '--- OBRIGADO PELA PREFERÊNCIA ---'}
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = (type: 'delivery' | 'kitchen') => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    
    printWindow.document.write(generatePrintHTML(selectedPrinterSize, type));
    printWindow.document.close();
    setIsPrintModalOpen(false);
  };

  if (!order) return <div className="p-8">Carregando...</div>;

  const isAdmin = user?.role === 'admin';
  const steps = getStepsForOrder(order);

  const getStepStatus = (stepId: string) => {
    if (order.status === 'cancelled') return 'cancelled';
    
    const statusOrder = ['pending_payment', 'preparing', 'delivering', 'completed'];
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left: Order Info */}
      <div className="lg:col-span-2">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (window.history.length > 2) {
                      navigate(-1);
                    } else {
                      navigate(user?.role === 'admin' ? '/admin' : '/orders');
                    }
                  }} 
                  className="p-1.5 mr-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Voltar"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black text-gray-900 mb-0.5 uppercase tracking-wider">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
                {isAdmin && (
                  <button 
                    onClick={() => setIsPrintModalOpen(true)}
                    className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer group"
                    title="Imprimir Pedido"
                  >
                    <Printer size={16} className="group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</p>
              {isAdmin && <p className="text-gray-900 mt-2 font-bold text-xs uppercase">Cliente: <span className="text-brand">{order.userName}</span></p>}
            </div>
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                    order.status === 'pending_payment' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'delivering' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
              {statusMap[order.status]}
            </span>
          </div>

          {/* Visual Order Progress Tracker / Stepper */}
          {order.status !== 'cancelled' ? (
            <>
              <div className="mb-6 bg-gray-50/70 rounded-2xl border border-gray-100 p-4 md:p-6">
                <div className="relative flex items-center justify-between">
                  {/* Background track line */}
                  <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 -z-0 hidden sm:block" />
                  
                  {/* Active progress track line */}
                  <div 
                    className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-brand -z-0 transition-all duration-500 hidden sm:block"
                    style={{
                      width: `${
                        order.status === 'pending_payment' ? '0%' :
                        order.status === 'preparing' ? '33.33%' :
                        order.status === 'delivering' ? '66.66%' :
                        '100%'
                      }`
                    }}
                  />

                  {/* Stepper items */}
                  {steps.map((step, idx) => {
                    const status = getStepStatus(step.id);
                    const StepIcon = step.icon;
                    
                    return (
                      <div key={step.id} className="relative flex flex-col items-center flex-1 z-10">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                          status === 'completed' ? 'bg-brand border-brand text-white shadow-sm shadow-brand/20' :
                          status === 'current' ? 'bg-white border-brand text-brand ring-4 ring-brand/10 font-bold scale-110' :
                          'bg-white border-gray-200 text-gray-400'
                        }`}>
                          <StepIcon size={18} className={status === 'current' ? 'animate-pulse' : ''} />
                        </div>
                        
                        <div className="text-center mt-2.5">
                          <p className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${
                            status === 'current' ? 'text-brand' :
                            status === 'completed' ? 'text-gray-900 font-bold' :
                            'text-gray-400'
                          }`}>
                            {step.label}
                          </p>
                          <p className="text-[8px] md:text-[9px] text-gray-500 font-semibold uppercase tracking-widest mt-0.5">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prazos Estimados */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  order.status === 'preparing' 
                    ? 'bg-blue-50/60 border-blue-100 text-blue-900 shadow-sm shadow-blue-50' 
                    : 'bg-gray-50/40 border-gray-100 text-gray-500 opacity-75'
                }`}>
                  <div className={`p-2 rounded-lg flex items-center justify-center ${
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <ChefHat size={18} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tempo de Preparo</h4>
                    <p className={`text-xs font-black uppercase tracking-wider mt-0.5 ${order.status === 'preparing' ? 'text-blue-900' : 'text-gray-600'}`}>
                      Até 30 Minutos
                    </p>
                    <p className="text-[9px] font-semibold mt-1">
                      {order.status === 'preparing' 
                        ? 'Seu pedido está sendo montado e frito na cozinha com todo capricho.' 
                        : 'Tempo estimado para preparo dos itens.'}
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  order.status === 'delivering' 
                    ? 'bg-purple-50/60 border-purple-100 text-purple-900 shadow-sm shadow-purple-50' 
                    : 'bg-gray-50/40 border-gray-100 text-gray-500 opacity-75'
                }`}>
                  <div className={`p-2 rounded-lg flex items-center justify-center ${
                    order.status === 'delivering' ? 'bg-purple-100 text-purple-600 animate-pulse' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Truck size={18} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tempo de Entrega</h4>
                    <p className={`text-xs font-black uppercase tracking-wider mt-0.5 ${order.status === 'delivering' ? 'text-purple-900' : 'text-gray-600'}`}>
                      Até 20 Minutos
                    </p>
                    <p className="text-[9px] font-semibold mt-1">
                      {order.status === 'delivering' 
                        ? 'O entregador já está a caminho com o seu pedido!' 
                        : 'Tempo de trânsito estimado do motoboy.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-800">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <XCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Pedido Cancelado</h4>
                <p className="text-xs text-red-700 mt-0.5 font-medium">Este pedido foi cancelado pelo estabelecimento. Se tiver alguma dúvida, pergunte no chat ao lado.</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-bold text-xs text-gray-900 mb-2 uppercase tracking-widest">Itens</h3>
            <ul className="divide-y divide-gray-50">
              {order.items.map((item, idx) => (
                <li key={idx} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-sm text-gray-900">{item.quantity}x {item.product.name}</span>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">
                      {item.selectedSize} {item.selectedOption && `• ${item.selectedOption}`}
                    </p>
                  </div>
                  <span className="font-black text-sm">{formatCurrency(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-widest text-gray-500">Total</span>
              <span className="font-black text-lg text-brand">{formatCurrency(order.total)}</span>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold text-xs text-gray-900 mb-2 uppercase tracking-widest">Endereço</h3>
              <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[50px]">{order.address}</p>
            </div>
            <div>
              <h3 className="font-bold text-xs text-gray-900 mb-2 uppercase tracking-widest">Forma de Pagamento</h3>
              <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[50px]">
                <p className="font-bold">
                  {(!order.paymentMethod || order.paymentMethod === 'pix') && 'PIX'}
                  {order.paymentMethod === 'credit' && 'Cartão de Crédito (na entrega)'}
                  {order.paymentMethod === 'debit' && 'Cartão de Débito (na entrega)'}
                  {order.paymentMethod === 'cash' && 'Dinheiro (na entrega)'}
                </p>
                {order.paymentMethod === 'cash' && (
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                    {order.changeRequested ? `Troco para: ${formatCurrency(order.changeFor || 0)}` : 'Não precisa de troco'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 shadow-sm">
              <h3 className="font-black text-xs text-amber-950 mb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-600 rounded-full inline-block animate-pulse"></span>
                Observações do Cliente / Instruções Especiais
              </h3>
              <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* Admin change-due reminder */}
          {isAdmin && order.paymentMethod === 'cash' && order.changeRequested && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center shadow-sm">
              <h3 className="font-black text-green-900 text-xs uppercase tracking-widest mb-1">Pagamento em Dinheiro — Precisa de Troco</h3>
              <p className="text-green-800 text-sm font-bold">
                Troco para: {formatCurrency(order.changeFor || 0)} (Levar {formatCurrency((order.changeFor || 0) - order.total)} de troco)
              </p>
            </div>
          )}

          {/* Admin Controls */}
          {isAdmin && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-6">
              <h3 className="font-bold text-[10px] text-gray-500 mb-3 uppercase tracking-widest">Controles do Administrador</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleStatusChange('preparing')} 
                  disabled={uploading || order.status === 'preparing'}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aprovar & Preparar
                </button>
                <button 
                  onClick={() => handleStatusChange('delivering')} 
                  disabled={uploading || order.status === 'delivering'}
                  className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Saiu p/ Entrega
                </button>
                <button 
                  onClick={() => handleStatusChange('completed')} 
                  disabled={uploading || order.status === 'completed'}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Concluído
                </button>
                <button 
                  onClick={() => handleStatusChange('cancelled')} 
                  disabled={uploading || order.status === 'cancelled'}
                  className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* User Pix Info */}
          {!isAdmin && order.status === 'pending_payment' && (
            <>
              {(!order.paymentMethod || order.paymentMethod === 'pix') ? (
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 mt-6 text-center">
                  <h3 className="font-bold text-yellow-900 mb-2">Pagamento via PIX</h3>
                  <p className="text-yellow-800 text-sm mb-4">
                    Copie a chave PIX abaixo, realize o pagamento e envie o comprovante no chat ao lado.
                  </p>
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <code className="bg-white px-4 py-2 rounded font-mono text-lg font-bold border border-yellow-300">
                        {companyInfo.pixKey}
                      </code>
                      <button onClick={copyPix} className="p-2 bg-yellow-200 text-yellow-900 rounded hover:bg-yellow-300 transition-colors" title="Copiar chave PIX">
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                    {companyInfo.pixKeyName && (
                      <p className="text-[10px] text-yellow-800 font-bold uppercase tracking-wider mt-1">
                        Beneficiário: {companyInfo.pixKeyName}
                      </p>
                    )}
                  </div>
                </div>
              ) : order.paymentMethod === 'credit' || order.paymentMethod === 'debit' ? (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6 text-center">
                  <h3 className="font-bold text-blue-900 mb-2">Pagamento na Entrega</h3>
                  <p className="text-blue-800 text-sm">
                    Seu pedido será pago na entrega usando <strong>{order.paymentMethod === 'credit' ? 'Cartão de Crédito' : 'Cartão de Débito'}</strong>. O entregador levará a maquininha.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200 mt-6 text-center">
                  <h3 className="font-bold text-green-900 mb-2">Pagamento na Entrega</h3>
                  <p className="text-green-800 text-sm">
                    Seu pedido será pago na entrega em <strong>Dinheiro</strong>.
                  </p>
                  {order.changeRequested ? (
                    <p className="text-green-700 text-xs mt-2 font-bold uppercase tracking-wider">
                      Troco para: {formatCurrency(order.changeFor || 0)} (Levar {formatCurrency((order.changeFor || 0) - order.total)} de troco)
                    </p>
                  ) : (
                    <p className="text-green-700 text-xs mt-2 font-bold uppercase tracking-wider">
                      Não precisa de troco (Valor exato)
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Chat */}
      <div className="bg-white shadow rounded-lg flex flex-col h-[500px] lg:h-[calc(100vh-120px)] lg:sticky lg:top-24 border border-gray-200">
        <div className="p-4 border-b bg-gray-50 rounded-t-lg">
          <h3 className="font-bold text-gray-900">Chat & Comprovantes</h3>
        </div>
        
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-200">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-3 shadow-sm ${
                msg.senderId === user?.uid ? 'bg-brand text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm border border-gray-200'
              }`}>
                {msg.senderId !== user?.uid && <span className="text-[9px] font-bold block mb-1 opacity-50 uppercase tracking-widest">{msg.senderName}</span>}
                {msg.imageUrl && (
                  <div className="mb-2 max-w-full overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPreviewImage(msg.imageUrl || null)}>
                    <img src={msg.imageUrl} alt="Anexo de pagamento" className="max-h-48 object-contain rounded" referrerPolicy="no-referrer" />
                  </div>
                )}
                {msg.text && <p className="text-xs font-medium leading-relaxed">{msg.text}</p>}
              </div>
              <span className="text-[9px] font-bold uppercase text-gray-400 mt-1">{format(new Date(msg.createdAt), 'HH:mm')}</span>
            </div>
          ))}
        </div>

        <div className="p-3 border-t bg-white rounded-b-xl space-y-2">
          {/* Selected Image Preview with cancel button */}
          {selectedImage && (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-100 p-2 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 relative shrink-0">
                  <img src={selectedImage.previewUrl} alt="Preview do anexo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 truncate max-w-[150px]">{selectedImage.file.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Pronto para enviar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(selectedImage.previewUrl);
                  setSelectedImage(null);
                }}
                className="p-1.5 hover:bg-gray-200 text-gray-500 hover:text-red-600 rounded-md transition-all active:scale-95"
                title="Remover imagem"
              >
                <XCircle size={18} />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-brand hover:text-brand-dark transition-colors shrink-0"
              title="Anexar comprovante ou foto"
            >
              <Upload size={20} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 border border-gray-200 focus:border-brand focus:ring-brand bg-gray-50 rounded-lg px-3 py-2 text-sm"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() && !selectedImage} 
              className="p-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors shadow-sm shrink-0 flex items-center justify-center"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Print Selection Modal */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setIsPrintModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-brand p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer size={20} />
                  <h3 className="font-black uppercase tracking-wider text-sm">Opções de Impressão</h3>
                </div>
                <button onClick={() => setIsPrintModalOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tamanho da Impressora</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedPrinterSize('80mm')}
                      className={`py-3 px-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-wider transition-all flex flex-col items-center gap-2 ${
                        selectedPrinterSize === '80mm' ? 'border-brand bg-brand/5 text-brand' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-lg">📏</span>
                      80mm (Grande)
                    </button>
                    <button
                      onClick={() => setSelectedPrinterSize('58mm')}
                      className={`py-3 px-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-wider transition-all flex flex-col items-center gap-2 ${
                        selectedPrinterSize === '58mm' ? 'border-brand bg-brand/5 text-brand' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-lg">📏</span>
                      58mm (Pequena)
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">O que deseja imprimir?</p>
                  
                  <button
                    onClick={() => handlePrint('delivery')}
                    className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Printer size={16} />
                    Imprimir Via Entrega
                  </button>

                  <button
                    onClick={() => handlePrint('kitchen')}
                    className="w-full bg-white border-2 border-gray-900 text-gray-900 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ChefHat size={16} />
                    Imprimir Via Cozinha
                  </button>
                </div>

                <p className="text-[9px] text-gray-400 text-center font-bold uppercase tracking-tighter italic">
                  * A impressão abrirá uma nova janela para comando direto do sistema.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white font-black hover:text-gray-300 text-xs uppercase tracking-widest"
            >
              Fechar [X]
            </button>
            <img 
              src={previewImage} 
              alt="Visualização" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Floating Animated Toast Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 w-full max-w-xs px-4"
          >
            <div className={`rounded-xl shadow-xl border p-4 flex items-center gap-3 ${
              alert.type === 'success' 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : alert.type === 'warning'
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              {alert.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-emerald-500/20">
                  <Check size={18} className="stroke-[3]" />
                </div>
              ) : alert.type === 'warning' ? (
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-amber-500/20">
                  <AlertCircle size={18} className="stroke-[3]" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-rose-500/20">
                  <XCircle size={18} className="stroke-[3]" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-wider leading-tight">
                  {alert.message}
                </p>
                {alert.submessage && (
                  <p className="text-[10px] opacity-90 mt-0.5 leading-none font-medium">
                    {alert.submessage}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
