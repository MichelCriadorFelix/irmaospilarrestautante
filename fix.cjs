const fs = require('fs');
let content = fs.readFileSync('src/pages/OrderDetails.tsx', 'utf8');

// Find the start of base64ToBlob
const b64start = content.indexOf('  const base64ToBlob = ');
// Find the start of handleImageSelect
const handleImageSelectStart = content.indexOf('  const handleImageSelect = ');

const newBlock = `  const base64ToBlob = (base64: string): Blob => {
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
            const compressedBase64 = await compressImage(imageToUpload.file);
            
            try {
              const fileRef = ref(storage, \`orders/\${id}/receipts/\${Date.now()}_\${imageToUpload.file.name}\`);
              const blob = base64ToBlob(compressedBase64);
              const uploadResult = await uploadBytes(fileRef, blob);
              imageUrl = await getDownloadURL(uploadResult.ref);
            } catch (storageErr) {
              console.warn('Error uploading to Firebase Storage, fallback to compressed Base64:', storageErr);
              imageUrl = compressedBase64;
            }
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

`;

content = content.substring(0, b64start) + newBlock + content.substring(handleImageSelectStart);
fs.writeFileSync('src/pages/OrderDetails.tsx', content);
