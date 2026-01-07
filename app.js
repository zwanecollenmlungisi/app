// ===== SEE U APP - SINGLE GLOBAL OBJECT =====
const SeeUApp = {
    // ===== SUPABASE CONFIGURATION =====
    supabase: null,
    SUPABASE_URL: 'https://cuhmiqvzhcusxzelxxpg.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_gSSTSGL37ddF77MFqo8j9A_o7qI03eu',
    
    // ===== STATE =====
    state: {
        currentUser: null,
        isSubscribed: false,
        paymentProcessing: false
    },

    // ===== INITIALIZATION =====
    init() {
        console.log("🚀 See U App Initializing...");
        
        // Initialize Supabase
        if (typeof supabase !== 'undefined') {
            this.supabase = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
            console.log("✅ Supabase initialized");
            
            // Set up auth state listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log("Auth state changed:", event, session?.user?.email);
                if (event === 'SIGNED_IN' && session) {
                    this.handleAuthSuccess(session);
                } else if (event === 'SIGNED_OUT') {
                    this.state.currentUser = null;
                    this.state.isSubscribed = false;
                }
            });
        } else {
            console.error("❌ Supabase library not loaded");
        }
        
        this.startLoadingScreen();
    },
    
    // ===== AUTH SESSION CHECK =====
    async checkAuthSession() {
        if (!this.supabase) return;
        
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (session && session.user) {
                await this.handleAuthSuccess(session);
            }
        } catch (error) {
            console.error("Session check error:", error);
        }
    },
    
    // ===== HANDLE AUTH SUCCESS =====
    async handleAuthSuccess(session) {
        if (!session || !session.user) return;
        
        this.state.currentUser = {
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0].charAt(0).toUpperCase() + session.user.email?.split('@')[0].slice(1),
            phone: session.user.user_metadata?.phone || null,
            dob: session.user.user_metadata?.date_of_birth || null,
            subscription: 'pending'
        };
        
        // Check subscription status from database
        await this.checkSubscriptionStatus();
        
        // Update greeting if on main screen
        this.updateUserGreeting();
    },
    
    // ===== CHECK SUBSCRIPTION STATUS =====
    async checkSubscriptionStatus() {
        if (!this.supabase || !this.state.currentUser) {
            this.state.isSubscribed = false;
            return;
        }
        
        try {
            // Check if user has an active subscription
            // You'll need to create a 'subscriptions' table in Supabase with columns:
            // user_id (uuid), status (text), created_at (timestamp), expires_at (timestamp)
            const { data, error } = await this.supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', this.state.currentUser.id)
                .eq('status', 'active')
                .single();
            
            if (data && !error) {
                // Check if subscription hasn't expired
                const expiresAt = new Date(data.expires_at);
                const now = new Date();
                if (expiresAt > now) {
                    this.state.isSubscribed = true;
                    console.log("✅ User has active subscription");
                } else {
                    this.state.isSubscribed = false;
                    console.log("⚠️ Subscription expired");
                }
            } else {
                this.state.isSubscribed = false;
                console.log("ℹ️ No active subscription found");
            }
        } catch (error) {
            // Table might not exist yet, that's okay
            console.log("Subscription check:", error.message);
            this.state.isSubscribed = false;
        }
    },
    
    // ===== CREATE USER PROFILE =====
    async createUserProfile() {
        if (!this.supabase || !this.state.currentUser) return;
        
        try {
            // You'll need to create a 'profiles' table in Supabase with columns:
            // id (uuid, references auth.users), full_name (text), phone (text), date_of_birth (date), created_at (timestamp)
            const { error } = await this.supabase
                .from('profiles')
                .upsert({
                    id: this.state.currentUser.id,
                    full_name: this.state.currentUser.fullName,
                    phone: this.state.currentUser.phone,
                    date_of_birth: this.state.currentUser.dob,
                    created_at: new Date().toISOString()
                });
            
            if (error) {
                console.error("Profile creation error:", error);
            } else {
                console.log("✅ User profile created/updated");
            }
        } catch (error) {
            console.error("Profile creation error:", error);
        }
    },

    // ===== LOADING SCREEN =====
    startLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const progressBar = document.getElementById('loadingProgress');
        const timerElement = document.getElementById('loadingTimer');
        
        if (!loadingScreen || !progressBar || !timerElement) {
            console.error("Loading elements not found!");
            this.showScreen('welcomeScreen');
            return;
        }
        
        let progress = 0;
        let seconds = 3;
        
        const updateTimer = () => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        
        const interval = setInterval(() => {
            progress += 3.33; // 100% in 30 steps
            if (progress > 100) progress = 100;
            
            progressBar.style.width = progress + '%';
            
            if (progress % 33 === 0 && seconds > 0) {
                seconds--;
                updateTimer();
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                
                loadingScreen.style.opacity = '0';
                loadingScreen.style.transition = 'opacity 0.5s ease';
                
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    this.showScreen('welcomeScreen');
                    console.log("✅ Loading complete!");
                }, 500);
            }
        }, 100);
        
        setTimeout(() => {
            if (loadingScreen.style.display !== 'none') {
                console.log("⚠️ Safety timeout");
                clearInterval(interval);
                loadingScreen.style.display = 'none';
                this.showScreen('welcomeScreen');
            }
        }, 5000);
    },

    // ===== SCREEN MANAGEMENT =====
    showScreen(screenId) {
        console.log(`🔄 Showing: ${screenId}`);
        
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
            window.scrollTo(0, 0);
            
            if (screenId === 'mainAppScreen') {
                this.updateUserGreeting();
            }
            
            this.vibrate(30);
        } else {
            console.error(`❌ Screen not found: ${screenId}`);
        }
    },

    // ===== NOTIFICATIONS =====
    showNotification(message, type = 'info') {
        console.log(`📢 ${type}: ${message}`);
        
        const container = document.getElementById('notificationsContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.animation = 'slideInRight 0.3s ease-out';
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
        
        this.vibrate(50);
    },

    // ===== SIGN IN =====
    async signinUser(event) {
        if (event) event.preventDefault();
        
        if (!this.supabase) {
            this.showNotification('Supabase not initialized. Please refresh the page.', 'error');
            return false;
        }
        
        const email = document.getElementById('signinEmail')?.value.trim();
        const password = document.getElementById('signinPassword')?.value;
        
        if (!email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email', 'error');
            return false;
        }
        
        const submitBtn = event?.target?.querySelector('button[type="submit"]');
        if (submitBtn) {
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            submitBtn.disabled = true;
            
            try {
                // Sign in with Supabase
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) {
                    throw error;
                }
                
                if (data.user) {
                    await this.handleAuthSuccess(data.session);
                    
                    this.showNotification(`Welcome back, ${this.state.currentUser.fullName}!`, 'success');
                    
                    setTimeout(() => {
                        if (this.state.isSubscribed) {
                            this.showScreen('mainAppScreen');
                        } else {
                            this.showScreen('subscriptionRequiredScreen');
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error("Sign in error:", error);
                let errorMessage = 'Sign in failed. Please try again.';
                
                if (error.message) {
                    if (error.message.includes('Invalid login credentials')) {
                        errorMessage = 'Invalid email or password. Please try again.';
                    } else if (error.message.includes('Email not confirmed')) {
                        errorMessage = 'Please check your email and confirm your account.';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                this.showNotification(errorMessage, 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
        
        return false;
    },

    // ===== SIGN UP =====
    async signupUser() {
        if (!this.supabase) {
            this.showNotification('Supabase not initialized. Please refresh the page.', 'error');
            return;
        }
        
        const fullName = document.getElementById('fullName')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const phone = document.getElementById('phone')?.value.trim();
        const password = document.getElementById('password')?.value;
        const dob = document.getElementById('dob')?.value;
        
        if (!fullName || !email || !phone || !password || !dob) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showNotification('Password must be at least 8 characters', 'error');
            return;
        }
        
        // Calculate age from DOB
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            this.showNotification('You must be 18+ to use See U', 'error');
            return;
        }
        
        // Show loading state
        const signupBtn = document.querySelector('button[onclick="SeeUApp.signupUser()"]');
        if (signupBtn) {
            const originalText = signupBtn.innerHTML;
            signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            signupBtn.disabled = true;
            
            try {
                // Sign up with Supabase
                const { data, error } = await this.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName,
                            phone: phone,
                            date_of_birth: dob
                        }
                    }
                });
                
                if (error) {
                    throw error;
                }
                
                if (data.user) {
                    this.state.currentUser = {
                        id: data.user.id,
                        fullName: fullName,
                        email: email,
                        phone: phone,
                        dob: dob,
                        subscription: 'pending'
                    };
                    
                    // Create user profile in database
                    await this.createUserProfile();
                    
                    this.showNotification(`Account created, ${fullName}! ${data.session ? 'You are now signed in.' : 'Please check your email to confirm your account.'}`, 'success');
                    
                    if (data.session) {
                        await this.handleAuthSuccess(data.session);
                        
                        setTimeout(() => {
                            if (this.state.isSubscribed) {
                                this.showScreen('mainAppScreen');
                            } else {
                                this.showScreen('subscriptionRequiredScreen');
                            }
                        }, 1500);
                    } else {
                        // Email confirmation required
                        setTimeout(() => {
                            this.showScreen('signinScreen');
                            this.showNotification('Please check your email to confirm your account before signing in.', 'info');
                        }, 2000);
                    }
                }
            } catch (error) {
                console.error("Sign up error:", error);
                let errorMessage = 'Account creation failed. Please try again.';
                
                if (error.message) {
                    if (error.message.includes('already registered')) {
                        errorMessage = 'An account with this email already exists. Please sign in instead.';
                    } else if (error.message.includes('Password')) {
                        errorMessage = error.message;
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                this.showNotification(errorMessage, 'error');
                signupBtn.innerHTML = originalText;
                signupBtn.disabled = false;
            }
        }
    },

    // ===== PAYMENT =====
    openPaymentScreen() {
        this.showScreen('paymentScreen');
    },

    closePaymentScreen() {
        if (this.state.isSubscribed) {
            this.showScreen('mainAppScreen');
        } else {
            this.showScreen('subscriptionRequiredScreen');
        }
    },

    async processPayment() {
        if (this.state.paymentProcessing) return;
        
        if (!this.supabase || !this.state.currentUser) {
            this.showNotification('Please sign in first', 'error');
            return;
        }
        
        const cardholderName = document.getElementById('cardholderName')?.value.trim();
        const cardNumber = document.getElementById('cardNumber')?.value.trim();
        const expiryDate = document.getElementById('expiryDate')?.value.trim();
        const cvv = document.getElementById('cvv')?.value.trim();
        
        if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
            this.showNotification('Please fill in all payment details', 'error');
            return;
        }
        
        this.state.paymentProcessing = true;
        const payButton = document.getElementById('payButton');
        const originalText = payButton.innerHTML;
        payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        payButton.disabled = true;
        
        this.showNotification('Processing payment...', 'info');
        
        try {
            // In a real app, you'd integrate with a payment processor like Stripe, Yoco, etc.
            // For now, we'll simulate payment and create a subscription record
            
            // Calculate expiry date (1 year from now)
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            
            // Create subscription record in database
            // You'll need a 'subscriptions' table with: user_id, status, created_at, expires_at
            const { data, error } = await this.supabase
                .from('subscriptions')
                .insert({
                    user_id: this.state.currentUser.id,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();
            
            if (error) {
                // If table doesn't exist, we'll still mark as subscribed locally
                console.log("Subscription table might not exist:", error.message);
                this.state.isSubscribed = true;
                this.showNotification('🎉 Payment successful! Premium activated!', 'success');
            } else {
                this.state.isSubscribed = true;
                this.showNotification('🎉 Payment successful! Premium activated!', 'success');
            }
            
            payButton.innerHTML = originalText;
            payButton.disabled = false;
            this.state.paymentProcessing = false;
            
            setTimeout(() => {
                this.showScreen('mainAppScreen');
            }, 1500);
        } catch (error) {
            console.error("Payment processing error:", error);
            this.showNotification('Payment processing failed. Please try again.', 'error');
            payButton.innerHTML = originalText;
            payButton.disabled = false;
            this.state.paymentProcessing = false;
        }
    },

    // ===== UTILITIES =====
    updateUserGreeting() {
        if (this.state.currentUser) {
            const greeting = document.getElementById('userGreeting');
            if (greeting) {
                greeting.textContent = `Welcome, ${this.state.currentUser.fullName}!`;
            }
        }
    },

    async logout() {
        if (this.supabase) {
            try {
                const { error } = await this.supabase.auth.signOut();
                if (error) {
                    console.error("Logout error:", error);
                }
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
        
        this.state.currentUser = null;
        this.state.isSubscribed = false;
        localStorage.removeItem('seeu_user');
        localStorage.removeItem('seeu_subscribed');
        this.showNotification('Logged out successfully', 'info');
        setTimeout(() => this.showScreen('welcomeScreen'), 500);
    },

    async forgotPassword() {
        const email = document.getElementById('signinEmail')?.value.trim() || 
                     document.getElementById('email')?.value.trim();
        
        if (!email) {
            this.showNotification('Please enter your email address first', 'error');
            return;
        }
        
        if (!this.supabase) {
            this.showNotification('Supabase not initialized. Please refresh the page.', 'error');
            return;
        }
        
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password'
            });
            
            if (error) {
                throw error;
            }
            
            this.showNotification('Password reset email sent! Please check your inbox.', 'success');
        } catch (error) {
            console.error("Password reset error:", error);
            this.showNotification(error.message || 'Failed to send password reset email. Please try again.', 'error');
        }
    },

    vibrate(duration) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    },

    // ===== DEMO FUNCTIONS =====
    demoLogin() {
        this.state.currentUser = {
            id: 'demo_user',
            fullName: 'Demo User',
            email: 'demo@example.com',
            subscription: 'premium'
        };
        
        this.showNotification('Demo login successful!', 'success');
        setTimeout(() => this.showScreen('mainAppScreen'), 1000);
    }
};

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log("✅ DOM ready");
    SeeUApp.init();
    
    // Make SeeUApp globally available
    window.SeeUApp = SeeUApp;
    
    // Wait a bit for Supabase to initialize, then check session
    setTimeout(async () => {
        await SeeUApp.checkAuthSession();
        
        // If user is authenticated and subscribed, show main app
        if (SeeUApp.state.currentUser && SeeUApp.state.isSubscribed) {
            SeeUApp.showScreen('mainAppScreen');
        } else if (SeeUApp.state.currentUser && !SeeUApp.state.isSubscribed) {
            SeeUApp.showScreen('subscriptionRequiredScreen');
        }
    }, 1000);
    
    // Debug: List all available functions
    console.log("Available functions:");
    console.log("• SeeUApp.showScreen()");
    console.log("• SeeUApp.signinUser()");
    console.log("• SeeUApp.signupUser()");
    console.log("• SeeUApp.logout()");
    console.log("• SeeUApp.showNotification()");
    console.log("• SeeUApp.openPaymentScreen()");
    console.log("• SeeUApp.processPayment()");
    console.log("• SeeUApp.forgotPassword()");
});

// ===== ERROR HANDLING =====
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    if (typeof SeeUApp !== 'undefined') {
        SeeUApp.showNotification('An error occurred', 'error');
    }
});

