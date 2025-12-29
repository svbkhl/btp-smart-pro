/**
 * Application de signature électronique et paiement
 * Gère le flux complet : affichage devis → signature → paiement → confirmation
 */

// Configuration
const CONFIG = {
    // URL de l'API backend (à configurer selon votre déploiement)
    API_BASE_URL: window.location.origin,
    // ID du devis (récupéré depuis l'URL ou passé en paramètre)
    QUOTE_ID: getQuoteIdFromUrl(),
};

// État de l'application
const state = {
    quote: null,
    signature: null,
    paymentSession: null,
    isSigning: false,
    isPaying: false,
};

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application initialisée');
    console.log('📋 Quote ID:', CONFIG.QUOTE_ID);
    
    initializeSignatureCanvas();
    setupEventListeners();
    loadQuote();
});

// ============================================
// UTILITAIRES
// ============================================

function getQuoteIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('quote_id') || params.get('id') || 'demo-quote-123';
}

function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency,
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    console.error('❌ Erreur:', message);
}

function showSection(sectionId) {
    document.getElementById(sectionId).style.display = 'block';
}

function hideSection(sectionId) {
    document.getElementById(sectionId).style.display = 'none';
}

// ============================================
// CHARGEMENT DU DEVIS
// ============================================

async function loadQuote() {
    console.log('📥 Chargement du devis...');
    
    try {
        // Option 1 : Charger depuis une API
        // const response = await fetch(`${CONFIG.API_BASE_URL}/api/quotes/${CONFIG.QUOTE_ID}`);
        // const quote = await response.json();
        
        // Option 2 : Utiliser Supabase (si disponible)
        // const { data, error } = await supabase
        //     .from('ai_quotes')
        //     .select('*')
        //     .eq('id', CONFIG.QUOTE_ID)
        //     .single();
        // const quote = data;
        
        // Option 3 : Données de démo (pour test)
        const quote = getDemoQuote();
        
        if (!quote) {
            throw new Error('Devis introuvable');
        }
        
        state.quote = quote;
        displayQuote(quote);
        console.log('✅ Devis chargé:', quote);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement du devis:', error);
        showError('Impossible de charger le devis. Veuillez réessayer.');
    }
}

function getDemoQuote() {
    // Données de démo - à remplacer par un vrai appel API
    return {
        id: CONFIG.QUOTE_ID,
        quote_number: 'DEV-2024-001',
        client_name: 'Jean Dupont',
        client_email: 'jean.dupont@example.com',
        estimated_cost: 1500.00,
        currency: 'EUR',
        created_at: new Date().toISOString(),
        details: {
            description: 'Travaux de rénovation - Peinture et plomberie',
            items: [
                { name: 'Peinture intérieure', quantity: 1, price: 800 },
                { name: 'Plomberie - Remplacement robinets', quantity: 1, price: 700 },
            ],
        },
    };
}

function displayQuote(quote) {
    document.getElementById('quote-number').textContent = quote.quote_number || 'N/A';
    document.getElementById('quote-client').textContent = quote.client_name || quote.client_email || 'N/A';
    document.getElementById('quote-date').textContent = formatDate(quote.created_at);
    document.getElementById('quote-amount').textContent = formatCurrency(quote.estimated_cost, quote.currency);
    
    if (quote.details?.description) {
        document.getElementById('quote-description').textContent = quote.details.description;
    } else {
        document.getElementById('quote-details').style.display = 'none';
    }
}

// ============================================
// SIGNATURE ÉLECTRONIQUE
// ============================================

function initializeSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // Ajuster la taille du canvas pour les écrans haute résolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Style de dessin
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Événements souris
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Événements tactiles
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    
    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = (e.clientX || e.touches[0].clientX) - rect.left;
        lastY = (e.clientY || e.touches[0].clientY) - rect.top;
    }
    
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const currentX = (e.clientX || e.touches[0].clientX) - rect.left;
        const currentY = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        lastX = currentX;
        lastY = currentY;
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    function handleTouch(e) {
        e.preventDefault();
        if (e.type === 'touchstart') {
            startDrawing(e);
        } else if (e.type === 'touchmove') {
            draw(e);
        }
    }
    
    console.log('✅ Canvas de signature initialisé');
}

function setupEventListeners() {
    // Formulaire de signature
    const signatureForm = document.getElementById('signature-form');
    if (signatureForm) {
        signatureForm.addEventListener('submit', handleSignatureSubmit);
    }
    
    // Bouton effacer signature
    const clearBtn = document.getElementById('clear-signature');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSignature);
    }
    
    // Bouton de paiement
    const payButton = document.getElementById('pay-button');
    if (payButton) {
        payButton.addEventListener('click', handlePayment);
    }
}

function clearSignature() {
    const canvas = document.getElementById('signature-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('🧹 Signature effacée');
}

function getSignatureData() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return null;
    
    // Vérifier si le canvas contient une signature
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some((channel, index) => {
        return index % 4 !== 3 && channel !== 0; // Vérifier les pixels non transparents
    });
    
    if (!hasSignature) {
        return null;
    }
    
    // Retourner l'image en base64
    return canvas.toDataURL('image/png');
}

async function handleSignatureSubmit(e) {
    e.preventDefault();
    console.log('✍️ Soumission de la signature...');
    
    const signerName = document.getElementById('signer-name').value.trim();
    const signatureData = getSignatureData();
    
    if (!signerName) {
        showError('Veuillez entrer votre nom');
        return;
    }
    
    if (!signatureData) {
        showError('Veuillez signer le document');
        return;
    }
    
    state.isSigning = true;
    const submitBtn = document.getElementById('submit-signature');
    const submitText = document.getElementById('submit-text');
    const submitLoading = document.getElementById('submit-loading');
    
    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitLoading.style.display = 'inline';
    
    try {
        // Préparer les données de signature
        const signaturePayload = {
            quote_id: CONFIG.QUOTE_ID,
            signer_name: signerName,
            signature_data: signatureData,
            signed_at: new Date().toISOString(),
        };
        
        console.log('📤 Envoi de la signature:', {
            quote_id: signaturePayload.quote_id,
            signer_name: signaturePayload.signer_name,
            signature_length: signaturePayload.signature_data.length,
        });
        
        // Option 1 : Appel API backend
        // const response = await fetch(`${CONFIG.API_BASE_URL}/api/signatures`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(signaturePayload),
        // });
        // const result = await response.json();
        
        // Option 2 : Utiliser Supabase
        // const { data, error } = await supabase
        //     .from('signatures')
        //     .insert(signaturePayload)
        //     .select()
        //     .single();
        // const result = data;
        
        // Option 3 : Simulation (pour test)
        const result = await simulateSignatureSubmission(signaturePayload);
        
        state.signature = result;
        console.log('✅ Signature enregistrée:', result);
        
        // Masquer la section signature et afficher la section paiement
        hideSection('signature-section');
        showSection('payment-section');
        
        // Afficher le montant dans la section paiement
        if (state.quote) {
            document.getElementById('payment-amount').textContent = 
                formatCurrency(state.quote.estimated_cost, state.quote.currency);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement de la signature:', error);
        showError('Erreur lors de l\'enregistrement de la signature. Veuillez réessayer.');
    } finally {
        state.isSigning = false;
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
    }
}

async function simulateSignatureSubmission(payload) {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
        id: 'sig-' + Date.now(),
        ...payload,
        status: 'signed',
    };
}

// ============================================
// PAIEMENT
// ============================================

async function handlePayment() {
    if (!state.quote || !state.signature) {
        showError('Veuillez d\'abord signer le devis');
        return;
    }
    
    console.log('💳 Initiation du paiement...');
    state.isPaying = true;
    
    const payButton = document.getElementById('pay-button');
    payButton.disabled = true;
    payButton.innerHTML = '<span>⏳ Création de la session de paiement...</span>';
    
    try {
        // Préparer les données de paiement
        const paymentPayload = {
            quote_id: CONFIG.QUOTE_ID,
            signature_id: state.signature.id,
            amount: state.quote.estimated_cost,
            currency: state.quote.currency || 'EUR',
            customer_email: state.quote.client_email,
            customer_name: state.quote.client_name,
        };
        
        console.log('📤 Création de la session de paiement:', paymentPayload);
        
        // Option 1 : Appel API backend
        // const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/create-session`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(paymentPayload),
        // });
        // const session = await response.json();
        
        // Option 2 : Utiliser Supabase Edge Function
        // const { data, error } = await supabase.functions.invoke('create-public-payment-session', {
        //     body: paymentPayload,
        // });
        // const session = data;
        
        // Option 3 : Simulation (pour test)
        const session = await simulatePaymentSessionCreation(paymentPayload);
        
        state.paymentSession = session;
        console.log('✅ Session de paiement créée:', session);
        
        // Rediriger vers Stripe Checkout
        if (session.checkout_url) {
            console.log('🔗 Redirection vers Stripe Checkout...');
            window.location.href = session.checkout_url;
        } else {
            throw new Error('URL de paiement non disponible');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la session de paiement:', error);
        showError('Erreur lors de la création de la session de paiement. Veuillez réessayer.');
        payButton.disabled = false;
        payButton.innerHTML = '<span>💳 Payer maintenant</span>';
        state.isPaying = false;
    }
}

async function simulatePaymentSessionCreation(payload) {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // En production, cette URL viendrait de Stripe
    return {
        checkout_url: `${window.location.origin}/payment/success?session_id=cs_test_${Date.now()}`,
        session_id: 'cs_test_' + Date.now(),
        payment_id: 'pay_' + Date.now(),
    };
}

// ============================================
// GESTION DU RETOUR DE PAIEMENT
// ============================================

function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentIntent = urlParams.get('payment_intent');
    
    if (sessionId || paymentIntent) {
        console.log('✅ Retour depuis le paiement:', { sessionId, paymentIntent });
        
        // Masquer toutes les sections
        hideSection('quote-section');
        hideSection('signature-section');
        hideSection('payment-section');
        
        // Afficher la section de confirmation
        showSection('confirmation-section');
        
        // Optionnel : Vérifier le statut du paiement via API
        // verifyPaymentStatus(sessionId || paymentIntent);
    }
}

// Appeler au chargement si on revient d'un paiement
if (window.location.search.includes('session_id') || window.location.search.includes('payment_intent')) {
    checkPaymentStatus();
}

// ============================================
// EXPORTS (pour tests)
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadQuote,
        handleSignatureSubmit,
        handlePayment,
        getSignatureData,
    };
}






