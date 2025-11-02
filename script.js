document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION ---
    const signupForm = document.querySelector('#signup-form');
    const loginForm = document.querySelector('#login-form');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = signupForm.querySelector('#full-name').value;
            const email = signupForm.querySelector('#email').value;
            const password = signupForm.querySelector('#password').value;
            const { data, error } = await _supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: fullName } }
            });
            if (error) { alert('Error signing up: ' + error.message); }
            else {
                alert('Sign up successful! Please check your email for a verification link.');
                window.location.href = 'login.html';
            }
        });

        // --- SEE PASSWORD LOGIC FOR SIGNUP ---
        const togglePassword = document.querySelector('#toggle-password');
        const passwordInput = signupForm.querySelector('#password'); 

        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                if (type === 'password') {
                    togglePassword.classList.remove('bx-hide');
                    togglePassword.classList.add('bx-show');
                } else {
                    togglePassword.classList.remove('bx-show');
                    togglePassword.classList.add('bx-hide');
                }
            });
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('#email').value;
            const password = loginForm.querySelector('#password').value;
            const { data, error } = await _supabase.auth.signInWithPassword({ email: email, password: password });
            if (error) { alert('Error logging in: ' + error.message); }
            else { window.location.href = 'index.html'; }
        });

        // --- SEE PASSWORD LOGIC FOR LOGIN ---
        const togglePassword = document.querySelector('#toggle-password');
        const passwordInput = loginForm.querySelector('#password');

        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                if (type === 'password') {
                    togglePassword.classList.remove('bx-hide');
                    togglePassword.classList.add('bx-show');
                } else {
                    togglePassword.classList.remove('bx-show');
                    togglePassword.classList.add('bx-hide');
                }
            });
        }
    }

    // --- NAVBAR UI ---
    const updateNavUI = async () => {
        const { data: { session } } = await _supabase.auth.getSession();
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        if (session) {
            const { data: profile } = await _supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
            const avatarUrl = profile?.avatar_url || 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
            
            const { count } = await _supabase.from('cart_items').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
            const cartBadge = (count && count > 0) ? `<span class="cart-badge">${count}</span>` : '';
            
            navActions.innerHTML = `
                <a href="profile.html" class="nav-profile-link"><img src="${avatarUrl}" alt="Your Avatar" class="navbar-avatar"></a>
                <a href="#" id="logout-button" class="login-btn">Log out</a>
                <a href="sell.html" class="btn btn-primary sell-btn">Sell Now</a>
                <a href="cart.html" class="cart-icon-link"><i class='bx bx-cart'></i>${cartBadge}</a>`;
            
            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await _supabase.auth.signOut();
                    window.location.href = 'login.html';
                });
            }
        } else {
            navActions.innerHTML = `
                <a href="login.html" class="login-btn">Log in</a>
                <a href="signup.html" class="btn btn-primary sell-btn">Sign Up</a>`;
        }
    };
    _supabase.auth.onAuthStateChange(() => { updateNavUI(); });
    updateNavUI();

    // --- PROFILE PAGE LOGIC (UPDATED) ---
    const profileForm = document.querySelector('#profile-form');
    if (profileForm) {
        let currentUser = null;

        const renderMyListings = (listings) => {
            const container = document.getElementById('my-listings-container');
            if (!container) return; 

            if (!listings || listings.length === 0) {
                container.innerHTML = '<p style="text-align: center;">You have no active listings.</p>';
                return;
            }

            container.innerHTML = ''; 
            listings.forEach(item => {
                const firstImage = item.image_url && item.image_url.length > 0 ? item.image_url[0] : 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
                const card = document.createElement('div');
                card.className = 'my-listing-card';
                
                card.innerHTML = `
                    <img src="${firstImage}" alt="${item.title}">
                    <div class="my-listing-info">
                        <h3>${item.title}</h3>
                        <p class="price">₹${item.price}</p>
                        <p>Type: ${item.item_type === 'business' ? 'Business Listing' : 'Product'}</p>
                    </div>
                    <button class="btn-sold" data-id="${item.id}" data-type="${item.item_type}">
                        Mark as Sold (Remove)
                    </button>
                `;
                container.appendChild(card);
            });

            container.querySelectorAll('.btn-sold').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const itemId = e.target.dataset.id;
                    const itemType = e.target.dataset.type;
                    const tableName = itemType === 'business' ? 'business_listings' : 'products';
                    
                    if (!itemId || !currentUser) { 
                        alert('Error: Listing or user ID not found.'); 
                        return; 
                    }

                    const confirmed = confirm('Are you sure you want to remove this listing? This item will be permanently deleted and cannot be recovered.');

                    if (confirmed) {
                        try {
                            const { data: { user } } = await _supabase.auth.getUser();
                            if (!user) { throw new Error("User not authenticated."); }

                            const { error: deleteError } = await _supabase
                                .from(tableName)
                                .delete()
                                .match({ id: itemId, seller_id: user.id }); 

                            if (deleteError) throw deleteError;
                            
                            alert('Item marked as sold and removed!');
                            loadMyListings(currentUser.id); 
                            updateNavUI(); 
                            
                        } catch (error) {
                            alert('Error removing item: ' + (error.message || 'Unknown error.'));
                        }
                    }
                });
            });
        };

        const loadMyListings = async (userId) => {
            if (!userId) return;

            const container = document.getElementById('my-listings-container');
            if (!container) return; 
            
            container.innerHTML = '<div class="loading-spinner">Loading Listings...</div>'; 

            try {
                const [productResult, businessResult] = await Promise.all([
                    _supabase.from('products').select('*').eq('seller_id', userId),
                    _supabase.from('business_listings').select('*').eq('seller_id', userId)
                ]);

                if (productResult.error) throw productResult.error;
                if (businessResult.error) throw businessResult.error;

                const typedProducts = (productResult.data || []).map(p => ({ ...p, item_type: 'product' }));
                const typedBusinesses = (businessResult.data || []).map(b => ({ ...b, item_type: 'business' }));
                
                const allListings = [...typedProducts, ...typedBusinesses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); 

                renderMyListings(allListings);

            } catch (error) {
                console.error('Error fetching listings:', error);
                if (container) container.innerHTML = '<p style="text-align: center; color: red;">Error loading your listings.</p>';
            }
        };

        const getProfile = async () => {
            const { data: { session } } = await _supabase.auth.getSession();
            if (session) {
                currentUser = session.user;
                document.getElementById('email').value = currentUser.email;
                const { data: profile } = await _supabase.from('profiles').select('full_name, avatar_url, phone_number, business_name, business_logo_url').eq('id', currentUser.id).single();
                
                if (profile) {
                    const fullNameEl = document.getElementById('full-name');
                    const phoneNumberEl = document.getElementById('phone-number');
                    const avatarImageEl = document.getElementById('avatar-image');
                    const businessNameEl = document.getElementById('business-name');
                    const businessLogoEl = document.getElementById('business-logo-image');

                    if (fullNameEl) fullNameEl.value = profile.full_name || '';
                    if (phoneNumberEl) phoneNumberEl.value = profile.phone_number || '';
                    if (avatarImageEl && profile.avatar_url) avatarImageEl.src = profile.avatar_url; 

                    if(businessNameEl) businessNameEl.value = profile.business_name || '';
                    if(businessLogoEl && profile.business_logo_url) businessLogoEl.src = profile.business_logo_url;
                }
                
                loadMyListings(currentUser.id);

            } else { window.location.href = "login.html"; }
        };

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('full-name').value;
            const phoneNumber = document.getElementById('phone-number').value;

            const updates = {
                id: currentUser.id,
                full_name: fullName,
                phone_number: phoneNumber,
                updated_at: new Date()
            };

            const businessNameEl = document.getElementById('business-name');
            if(businessNameEl) updates.business_name = businessNameEl.value;

            const avatarFile = document.getElementById('avatar-file-input').files[0];
            const businessLogoFile = document.getElementById('business-logo-input')?.files[0];

            let avatarUrl = document.getElementById('avatar-image')?.src;
            
            if (!currentUser) { 
                alert('Error: User session expired. Please re-login.');
                window.location.href = 'login.html';
                return;
            }

            if (avatarFile) {
                const filePath = `${currentUser.id}/avatar_${Date.now()}_${avatarFile.name}`;
                const { error: uploadError } = await _supabase.storage.from('avatars').upload(filePath, avatarFile);
                if (uploadError) { alert('Error uploading avatar: ' + uploadError.message); return; }
                updates.avatar_url = _supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
            }

            if (businessLogoFile) {
                const filePath = `${currentUser.id}/logo_${Date.now()}_${businessLogoFile.name}`;
                const { error: uploadError } = await _supabase.storage.from('avatars').upload(filePath, businessLogoFile);
                if (uploadError) { alert('Error uploading business logo: ' + uploadError.message); return; }
                updates.business_logo_url = _supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
            }

            const { error } = await _supabase.from('profiles').upsert(updates);
            if (error) { alert('Error updating profile: ' + error.message); }
            else {
                alert('Profile updated successfully!');
                getProfile();
                updateNavUI();
            }
        });
        
        getProfile();
    }

    // --- SELL PAGE LOGIC (For Regular Products) ---
    const sellForm = document.querySelector('#sell-form');
    if (sellForm) {
        const imageInput = document.getElementById('item-images');
        const previewContainer = document.getElementById('image-preview-container');
        const submitButton = document.getElementById('submit-listing-btn');
        let selectedFiles = [];
        
        if (imageInput) {
            imageInput.addEventListener('change', () => {
                if (imageInput.files.length > 5) {
                    alert('You can only upload a maximum of 5 images.');
                    imageInput.value = '';
                    return;
                }
                selectedFiles = Array.from(imageInput.files);
                if (previewContainer) previewContainer.innerHTML = '';
                selectedFiles.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const previewWrapper = document.createElement('div');
                        previewWrapper.className = 'img-preview-wrapper';
                        previewWrapper.innerHTML = `<img src="${e.target.result}" alt="${file.name}">`;
                        if (previewContainer) previewContainer.appendChild(previewWrapper);
                    };
                    reader.readAsDataURL(file);
                });
            });
        }
        
        sellForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session) { alert('You must be logged in to sell an item.'); window.location.href = 'login.html'; return; }
            if (selectedFiles.length === 0) { alert('Please upload at least one image.'); return; }
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Listing your item...';
            }
            try {
                const uploadPromises = selectedFiles.map(file => {
                    const filePath = `${session.user.id}/products/${Date.now()}_${file.name}`;
                    return _supabase.storage.from('products').upload(filePath, file);
                });
                const uploadResults = await Promise.all(uploadPromises);
                const uploadErrors = uploadResults.filter(result => result.error);
                if (uploadErrors.length > 0) { throw new Error(`Error uploading images: ${uploadErrors.map(e => e.error.message).join(', ')}`); }
                const imageUrls = uploadResults.map(result => {
                    const { data: { publicUrl } } = _supabase.storage.from('products').getPublicUrl(result.data.path);
                    return publicUrl;
                });
                
                const title = document.getElementById('item-title')?.value;
                const description = document.getElementById('item-description')?.value;
                const price = document.getElementById('item-price')?.value;
                const category = document.getElementById('item-category')?.value;
                const location = document.getElementById('item-location')?.value;
                
                if (!title || !price || !category) {
                     alert('Please fill in Title, Price, and Category.');
                     if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'List Item for Sale'; }
                     return;
                }

                const { error: insertError } = await _supabase.from('products').insert({
                    title: title,
                    description: description,
                    price: price,
                    category: category,
                    location: location,
                    image_url: imageUrls,
                    seller_id: session.user.id
                });
                if (insertError) throw insertError;
                
                alert('Item listed successfully!');
                window.location.href = 'browse.html';
            } catch (error) {
                alert('An error occurred: ' + error.message);
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'List Item for Sale';
                }
            }
        });
    }

    // --- *** START OF REPLACED BROWSE PAGE LOGIC (SCALABLE) *** ---
    if (document.getElementById('price-range')) {
        
        // --- 1. Get all filter elements ---
        const listingGrid = document.querySelector('.browse-layout .listing-grid');
        const priceRangeFilter = document.getElementById('price-range');
        const priceRangeValue = document.getElementById('price-range-value');
        const searchInput = document.getElementById('search-filter');
        const categoryRadios = document.querySelectorAll('input[name="category"]');
        const loadMoreBtn = document.getElementById('load-more-btn-browse'); // Unique ID
        
        // --- 2. State variables ---
        let currentPage = 0;
        const itemsPerPage = 12; // Load 12 items at a time
        let isLoading = false;

        // --- 3. Main function to load products ---
        const loadProducts = async (isNewQuery = false) => {
            if (isLoading) return;
            isLoading = true;
            if (loadMoreBtn) loadMoreBtn.textContent = 'Loading...';

            // If a filter changed, reset everything
            if (isNewQuery) {
                currentPage = 0;
                listingGrid.innerHTML = '';
            }

            // --- 4. Get all filter values ---
            const searchTerm = searchInput?.value.toLowerCase() || '';
            const category = document.querySelector('input[name="category"]:checked')?.value || 'all';
            const maxPrice = priceRangeFilter?.value;

            // --- 5. Build the Supabase query ---
            let query = _supabase
                .from('products')
                .select(`*, profiles!seller_id(full_name, avatar_url)`);

            // Add server-side filters
            if (category !== 'all') {
                query = query.eq('category', category);
            }
            if (searchTerm) {
                // Search both title and description
                query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
            }
            if (maxPrice) {
                query = query.lte('price', Number(maxPrice));
            }

            // --- 6. Add pagination to the query ---
            const from = currentPage * itemsPerPage;
            const to = from + itemsPerPage - 1;
            query = query.range(from, to);

            // --- 7. Fetch data and render ---
            const { data: products, error } = await query;

            if (error) {
                console.error('Error fetching products:', error);
                listingGrid.innerHTML = '<p>Could not load products. Please try again later.</p>';
            } else {
                if (products.length > 0) {
                    renderProducts(products); // Render the items
                    currentPage++; // Go to the next page for the *next* load
                }

                // Show or hide the "Load More" button
                if (loadMoreBtn) {
                    if (products.length < itemsPerPage) {
                        loadMoreBtn.style.display = 'none'; // No more items
                    } else {
                        loadMoreBtn.style.display = 'block'; // More items exist
                    }
                }
                
                // Show "no results" message only on a new query
                if (isNewQuery && products.length === 0) {
                    listingGrid.innerHTML = '<p>No items found matching your criteria.</p>';
                }
            }
            
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = 'Load More';
        };

        // --- 8. Render function (appends items) ---
        const renderProducts = (productsToRender) => {
            if (!listingGrid) return;

            productsToRender.forEach(product => {
                const firstImage = product.image_url && product.image_url.length > 0 ? product.image_url[0] : 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
                const productCardHTML = `
                    <div class="product-card-link"> <div class="product-card">
                            <a href="product.html?id=${product.id}" class="product-card-image-link"> <img src="${firstImage}" alt="${product.title}">
                            </a>
                            <div class="product-info">
                                <h3><a href="product.html?id=${product.id}">${product.title}</a></h3> <p class="price">₹${product.price}</p>
                                <div class="product-card-footer">
                                    <div class="seller-info">
                                        <img src="${product.profiles?.avatar_url || 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg'}" alt="Seller">
                                        <span>${product.profiles?.full_name || 'Campus Seller'}</span>
                                    </div>
                                    <button class="btn-add-to-cart" data-id="${product.id}" data-type="product"><i class='bx bx-cart-add'></i> Add to Cart</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                listingGrid.innerHTML += productCardHTML; // Use += to append
            });
        };

        // --- 9. Function to update price slider max value ---
        const updatePriceSlider = async () => {
            // Get the highest price from the products table
            const { data, error } = await _supabase
                .from('products')
                .select('price')
                .order('price', { ascending: false })
                .limit(1)
                .single();
                
            if (error || !data) return;
            const maxPrice = Number(data.price) || 10000;

            if (priceRangeFilter) {
                priceRangeFilter.max = maxPrice > 10000 ? maxPrice : 10000;
                priceRangeFilter.value = priceRangeFilter.max;
                if (priceRangeValue) {
                    priceRangeValue.textContent = `₹${parseInt(priceRangeFilter.max).toLocaleString('en-IN')}`;
                }
            }
        };

        // --- 10. All Event Listeners ---
        
        // Function to call when any filter changes
        const handleFilterChange = () => {
            loadProducts(true); // true = new query
        };

        // Add to Cart listener (uses event delegation, more efficient)
        listingGrid.addEventListener('click', async (e) => {
            const button = e.target.closest('.btn-add-to-cart');
            if (button) {
                const productId = button.dataset.id;
                const itemType = button.dataset.type;
                const { data: { session } } = await _supabase.auth.getSession();
                if (!session) { alert('Please log in to add items to your cart.'); window.location.href = 'login.html'; return; }

                const { error } = await _supabase.from('cart_items').insert({ product_id: productId, user_id: session.user.id, item_type: itemType });
                if (error) {
                    if (error.code === '23505') { alert('This item is already in your cart.'); }
                    else { alert('Error adding item to cart: ' + error.message); }
                } else {
                    alert('Item added to cart!');
                    updateNavUI();
                }
            }
        });

        // Filter listeners
        if (priceRangeFilter) {
            priceRangeFilter.addEventListener('input', () => {
                 if (priceRangeValue) {
                    priceRangeValue.textContent = `₹${parseInt(priceRangeFilter.value).toLocaleString('en-IN')}`;
                 }
            });
            // 'change' event fires when user releases the slider
            priceRangeFilter.addEventListener('change', handleFilterChange);
        }
        if (searchInput) {
            // 'change' event fires when user presses Enter or clicks away
            searchInput.addEventListener('change', handleFilterChange);
        }
        if (categoryRadios) {
            categoryRadios.forEach(radio => radio.addEventListener('change', handleFilterChange));
        }
        
        // "Load More" button listener
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loadProducts(false); // false = append
            });
        }

        // --- 11. Initial Load ---
        updatePriceSlider(); // Set max price
        loadProducts(true); // Load first page of items
    }
    // --- *** END OF REPLACED BROWSE PAGE LOGIC *** ---


    // --- PRODUCT DETAIL PAGE LOGIC (UPDATED WITH REVIEWS) ---
    const productDetailContainer = document.querySelector('#product-detail-container');
    if (productDetailContainer) {
        let currentProductId = null;
        const reviewsList = document.getElementById('reviews-list');
        const reviewForm = document.getElementById('review-form');
        const reviewImageInput = document.getElementById('review-images');
        const reviewImagePreview = document.getElementById('review-image-preview');
        let reviewFiles = [];

        if (reviewImageInput) {
            reviewImageInput.addEventListener('change', () => {
                if (reviewImageInput.files.length > 5) {
                    alert('You can only upload a maximum of 5 images for a review.');
                    reviewImageInput.value = '';
                    return;
                }
                reviewFiles = Array.from(reviewImageInput.files);
                if (reviewImagePreview) reviewImagePreview.innerHTML = '';
                reviewFiles.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const previewWrapper = document.createElement('div');
                        previewWrapper.className = 'img-preview-wrapper';
                        previewWrapper.innerHTML = `<img src="${e.target.result}" alt="${file.name}">`;
                        if (reviewImagePreview) reviewImagePreview.appendChild(previewWrapper);
                    };
                    reader.readAsDataURL(file);
                });
            });
        }

        const renderReviews = (reviews) => {
            if (!reviewsList) return;
            reviewsList.innerHTML = '';
            const validReviews = reviews ? reviews.filter(r => r.profiles) : [];
            if (validReviews.length === 0) {
                reviewsList.innerHTML = '<p>No feedback yet.</p>';
                return;
            }

            validReviews.forEach(review => {
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                let imagesHTML = '';
                if (review.image_urls && review.image_urls.length > 0) {
                    imagesHTML = `<div class="review-images">` +
                        review.image_urls.map(url => `<img src="${url}" alt="Review image" style="max-width: 100px; margin: 5px;">`).join('') +
                        `</div>`;
                }
                reviewsList.innerHTML += `
                    <div class="review-card">
                        <div class="review-header">
                            <img src="${review.profiles?.avatar_url || 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg'}" alt="Reviewer" class="navbar-avatar">
                            <div class="review-meta">
                                <strong>${review.profiles?.full_name || 'Anonymous'}</strong>
                                <div class="stars">${stars}</div>
                            </div>
                        </div>
                        <p class="review-comment">${review.comment || ''}</p>
                        ${imagesHTML}
                    </div>
                `;
            });
        };

        const fetchReviews = async (productId) => {
            if (!productId || !reviewsList) return;
            const { data: reviews, error } = await _supabase
                .from('reviews')
                .select(`*, profiles!reviewer_id(full_name, avatar_url)`)
                .eq('product_id', productId)
                .not('product_id', 'is', null)
                .order('created_at', { ascending: false });
                
            if (error) console.error('Error fetching reviews:', error);
            else renderReviews(reviews);
        };

        if (reviewForm) {
            reviewForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!currentProductId) {
                    alert('Could not identify the product to review. Please refresh the page.');
                    return;
                }
                const { data: { session } } = await _supabase.auth.getSession();
                if (!session) { alert('You must be logged in to leave a review.'); return; }
                const rating = reviewForm.querySelector('input[name="rating"]:checked')?.value;
                const comment = reviewForm.querySelector('#comment')?.value;
                if (!rating) { alert('Please select a star rating.'); return; }

                let imageUrls = null;
                if (reviewFiles.length > 0) {
                    const submitButton = reviewForm.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.disabled = true;
                        submitButton.textContent = 'Uploading images...';
                    }
                    
                    try {
                        const uploadPromises = reviewFiles.map(file => {
                            const filePath = `${session.user.id}/reviews/${currentProductId}_${Date.now()}_${file.name}`;
                            return _supabase.storage.from('reviews').upload(filePath, file);
                        });
                        const uploadResults = await Promise.all(uploadPromises);
                        const uploadErrors = uploadResults.filter(result => result.error);
                        if (uploadErrors.length > 0) {
                            throw new Error(`Error uploading images: ${uploadErrors.map(e => e.error.message).join(', ')}`);
                        }
                        imageUrls = uploadResults.map(result => _supabase.storage.from('reviews').getPublicUrl(result.data.path).data.publicUrl);
                    } catch (uploadError) {
                        alert('Error uploading review images: ' + uploadError.message);
                    } finally {
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Review';
                        }
                        if (uploadError) return;
                    }
                }

                const urlParams = new URLSearchParams(window.location.search);
                const itemTypeForReview = urlParams.get('type') || 'product';

                const { error } = await _supabase.from('reviews').insert({
                    product_id: currentProductId,
                    reviewer_id: session.user.id,
                    rating: parseInt(rating),
                    comment: comment,
                    image_urls: imageUrls,
                    item_type: itemTypeForReview
                });

                if (error) { alert('Error submitting review: ' + error.message); }
                else {
                    alert('Thank you for your feedback!');
                    reviewForm.reset();
                    if (reviewImagePreview) reviewImagePreview.innerHTML = '';
                    reviewFiles = [];
                    fetchReviews(currentProductId);
                }
            });
        }

        const fetchProductDetails = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            const itemType = urlParams.get('type');

            if (!productId) {
                if (productDetailContainer) productDetailContainer.innerHTML = '<p>Product not found.</p>';
                return;
            }

            currentProductId = productId;

            const fromTable = itemType === 'business' ? 'business_listings' : 'products';

            const { data: product, error } = await _supabase.from(fromTable).select(`*, profiles!seller_id(*)`).eq('id', productId).single();

            if (error || !product) {
                console.error('Error fetching product details:', error);
                if (productDetailContainer) productDetailContainer.innerHTML = '<p>Could not load product details.</p>';
                return;
            }

            document.title = `${product.title} - 2ndhand`;

            let displayName;
            let displayImage;

            if (itemType === 'business') {
                displayName = product.profiles?.business_name || product.profiles?.full_name || 'Campus Seller';
                displayImage = product.profiles?.business_logo_url || product.profiles?.avatar_url || 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
            } else {
                displayName = product.profiles?.full_name || 'Campus Seller';
                displayImage = product.profiles?.avatar_url || 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
            }

            const mainImage = product.image_url && product.image_url.length > 0 ? product.image_url[0] : 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
            const sellerPhoneNumber = product.profiles?.phone_number;
            const productName = product.title;

            const productHTML = `
                <div class="product-detail-layout">
                    <div class="product-gallery">
                        <div class="main-image-container"><img src="${mainImage}" alt="${product.title}" class="main-product-image"></div>
                    </div>
                    <div class="product-info-details">
                        <p class="breadcrumb">${product.category ? product.category.toUpperCase() : 'GENERAL'}</p>
                        <h1>${product.title}</h1>
                        <p class="price">₹${product.price}</p>
                        <p class="description">${product.description || 'No description provided.'}</p>
                        <div class="seller-card">
                            <div class="seller-card-content">
                                <img src="${displayImage}" alt="${displayName}">
                                <div class="seller-name-info">
                                    <strong>${displayName}</strong>
                                    <span>${product.location || 'Campus Location'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="product-actions">
                            <a id="message-seller-btn" href="#" class="btn btn-primary btn-message ${!sellerPhoneNumber ? 'disabled' : ''}">Message Seller</a>
                            <button class="btn-add-to-cart"><i class='bx bx-cart-add'></i> Add to Cart</button>
                        </div>
                    </div>
                </div>`;
            if (productDetailContainer) productDetailContainer.innerHTML = productHTML;


            const messageSellerBtn = document.getElementById('message-seller-btn');
            if (sellerPhoneNumber && messageSellerBtn) {
                 if (/^\d{10,15}$/.test(sellerPhoneNumber.replace(/\D/g,''))) {
                     const message = encodeURIComponent(`Hi, I'm interested in your item "${productName}" listed on 2ndhand.`);
                     messageSellerBtn.href = `https://wa.me/${sellerPhoneNumber.replace(/\D/g,'')}?text=${message}`;
                     messageSellerBtn.target = "_blank";
                     messageSellerBtn.classList.remove('disabled');
                 } else {
                     console.warn('Invalid phone number format provided by seller:', sellerPhoneNumber);
                     messageSellerBtn.classList.add('disabled');
                     messageSellerBtn.href = '#';
                 }
            } else if (messageSellerBtn) {
                 messageSellerBtn.classList.add('disabled');
                 messageSellerBtn.href = '#';
            }


            const addToCartBtn = productDetailContainer.querySelector('.btn-add-to-cart');
            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const { data: { session } } = await _supabase.auth.getSession();
                    if (!session) { alert('Please log in to add items to your cart.'); window.location.href = 'login.html'; return; }

                    const itemTypeForCart = urlParams.get('type') || 'product';

                    const { error } = await _supabase.from('cart_items').insert({ product_id: productId, user_id: session.user.id, item_type: itemTypeForCart });
                    if (error) {
                        if (error.code === '23505') { alert('This item is already in your cart.'); }
                        else { alert('Error adding item to cart: ' + error.message); }
                    } else {
                        alert('Item added to cart!');
                        updateNavUI();
                    }
                });
            }
            fetchReviews(currentProductId);
        };
        fetchProductDetails();
    }


    // --- CART PAGE LOGIC (FINAL) ---
    const cartContainer = document.querySelector('#cart-container');
    if (cartContainer) {
        const loadCart = async () => {
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session) {
                cartContainer.innerHTML = '<p>Please <a href="login.html">log in</a> to view your cart.</p>';
                return;
            }

            const { data: cartItems, error: cartError } = await _supabase
                .from('cart_items')
                .select('id, product_id, item_type')
                .eq('user_id', session.user.id)
                .not('product_id', 'is', null); // <-- This hides items where product was deleted

            if (cartError) {
                cartContainer.innerHTML = '<p>Error loading your cart.</p>';
                console.error('Error fetching cart items:', cartError);
                return;
            }

            if (cartItems.length === 0) {
                cartContainer.innerHTML = '<p>Your cart is empty. <a href="browse.html">Start shopping!</a></p>';
                return;
            }

            const productIds = cartItems.filter(i => (i.item_type === 'product' || !i.item_type) && i.product_id).map(i => i.product_id);
            const businessIds = cartItems.filter(i => i.item_type === 'business' && i.product_id).map(i => i.product_id);

            let allItemDetails = [];

            if (productIds.length > 0) {
                const { data: products, error } = await _supabase.from('products').select('*').in('id', productIds);
                if (products) {
                    const detailedProducts = products.map(p => ({ 
                        ...p, 
                        cart_item_id: cartItems.find(ci => ci.product_id === p.id && (ci.item_type === 'product' || !ci.item_type))?.id,
                        item_type: 'product'
                    }));
                    allItemDetails.push(...detailedProducts.filter(p => p.cart_item_id)); 
                } else if (error) {
                    console.error("Error fetching product details:", error);
                }
            }

            if (businessIds.length > 0) {
                 const { data: businesses, error } = await _supabase.from('business_listings').select('*').in('id', businessIds);
                 if (businesses) {
                      const detailedBusinesses = businesses.map(b => {
                           const cartItem = cartItems.find(ci => ci.product_id === b.id && ci.item_type === 'business');
                           return { ...b, cart_item_id: cartItem?.id, item_type: 'business' };
                      });
                      allItemDetails.push(...detailedBusinesses.filter(b => b.cart_item_id)); 
                 } else if (error) {
                      console.error("Error fetching business listing details:", error);
                 }
            }


            let subtotal = 0;
            let itemsHTML = allItemDetails.map(item => {
                const itemPrice = Number(item.price || 0);
                subtotal += itemPrice;
                
                const firstImage = item.image_url && item.image_url.length > 0 ? item.image_url[0] : 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
                const cartItemId = item.cart_item_id;
                
                return `
                    <div class="cart-item" data-id="${cartItemId}">
                        <img src="${firstImage}" alt="${item.title}" class="cart-item-img">
                        <div class="cart-item-info">
                            <h3>${item.title}</h3>
                            <p class="price">₹${itemPrice.toFixed(2)}</p>
                            <button class="remove-item-btn">Remove</button>
                        </div>
                    </div>`;
            }).join('');


            const summaryHTML = `
                <div class="cart-summary">
                    <h2>Order Summary</h2>
                    <div class="summary-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
                    <div class="summary-row total"><span>Total</span><span>₹${subtotal.toFixed(2)}</span></div>
                    <button class="btn btn-primary">Proceed to Checkout</button>
                </div>`;

            if (allItemDetails.length > 0) {
                cartContainer.innerHTML = `<div class="cart-layout"><div class="cart-items-list">${itemsHTML}</div>${summaryHTML}</div>`;
            } else {
                 console.warn("Cart appears empty after fetching details. Cart Items:", cartItems, "Fetched Details:", allItemDetails);
                 cartContainer.innerHTML = '<p>Your cart is empty or items could not be loaded. <a href="browse.html">Start shopping!</a></p>';
            }


            document.querySelectorAll('.remove-item-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const cartItemEl = e.target.closest('.cart-item');
                    const cartItemId = cartItemEl?.dataset.id;
                    
                    if (!cartItemId) {
                         console.error("Could not find cart item ID to remove.");
                         alert('Error removing item.');
                         return;
                    }
                    
                    const { error } = await _supabase.from('cart_items').delete().match({ id: cartItemId });
                    if (error) {
                         console.error("Error removing item from DB:", error);
                         alert('Error removing item: ' + error.message);
                    } else {
                         if (cartItemEl) {
                             cartItemEl.style.opacity = '0';
                             setTimeout(() => {
                                 cartItemEl.remove();
                                 loadCart();
                                 updateNavUI();
                             }, 300);
                         } else {
                             loadCart();
                             updateNavUI();
                         }
                    }
                });
            });
        };
        loadCart();
    }


    // --- HOMEPAGE FEATURED LOGIC (PRO BUSINESSES ONLY) ---
    const featuredListingsGrid = document.querySelector('#featured-listings-grid');
    if (featuredListingsGrid) {
        const fetchFeaturedBusinesses = async () => {
            try {
                const { data: businesses, error: businessError } = await _supabase
                    .from('business_listings')
                    .select(`*, profiles!seller_id(full_name, avatar_url, business_name, business_logo_url)`)
                    .eq('is_featured', true) 
                    .order('created_at', { ascending: false })
                    .limit(4); 

                if (businessError) throw businessError;

                featuredListingsGrid.innerHTML = '';
                if (!businesses || businesses.length === 0) {
                    featuredListingsGrid.innerHTML = '<p>No featured items available right now.</p>';
                    return;
                }

                businesses.forEach(item => {
                    const firstImage = item.image_url && item.image_url.length > 0 ? item.image_url[0] : 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
                    
                    const link = `product.html?id=${item.id}&type=business`;
                    const sellerName = item.profiles?.business_name || item.profiles?.full_name || 'Campus Seller';
                    const sellerAvatar = item.profiles?.business_logo_url || item.profiles?.avatar_url || 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
                    const itemPrice = `From ₹${item.price}`;

                    const itemCardHTML = `
                        <a href="${link}" class="product-card-link">
                            <div class="product-card">
                                <img src="${firstImage}" alt="${item.title}">
                                <div class="product-info">
                                    <h3>${item.title}</h3>
                                    <p class="price">${itemPrice}</p>
                                    <div class="product-card-footer">
                                        <div class="seller-info">
                                            <img src="${sellerAvatar}" alt="${sellerName}">
                                            <span>${sellerName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </a>
                    `;
                    featuredListingsGrid.innerHTML += itemCardHTML;
                });

            } catch (error) {
                console.error('Error fetching featured items:', error);
                featuredListingsGrid.innerHTML = '<p>Could not load featured items.</p>';
            }
        };
        fetchFeaturedBusinesses();
    }


    // --- BUSINESS SELL PAGE LOGIC (Form submission) ---
    const businessSellFormElement = document.querySelector('#business-sell-form');
    if (businessSellFormElement) {
        const imageInput = document.getElementById('item-images');
        const previewContainer = document.getElementById('image-preview-container');
        const submitButton = document.getElementById('submit-listing-btn');
        let selectedFiles = [];

        if (imageInput) {
             imageInput.addEventListener('change', () => {
                 if (imageInput.files.length > 5) {
                     alert('You can only upload a maximum of 5 images.');
                     imageInput.value = '';
                     return;
                 }
                 selectedFiles = Array.from(imageInput.files);
                 if (previewContainer) {
                      previewContainer.innerHTML = '';
                      selectedFiles.forEach(file => {
                           const reader = new FileReader();
                           reader.onload = (e) => {
                                const previewWrapper = document.createElement('div');
                                previewWrapper.className = 'img-preview-wrapper';
                                previewWrapper.innerHTML = `<img src="${e.target.result}" alt="${file.name}">`;
                                previewContainer.appendChild(previewWrapper);
                           };
                           reader.readAsDataURL(file);
                      });
                 }
             });
        }


        businessSellFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session) { alert('You must be logged in to create a listing.'); window.location.href = 'login.html'; return; }
            if (selectedFiles.length === 0) { alert('Please upload at least one image.'); return; }

            if (submitButton) {
                 submitButton.disabled = true;
                 submitButton.textContent = 'Creating your listing...';
            }


            try {
                const uploadPromises = selectedFiles.map(file => {
                    const filePath = `${session.user.id}/businesses/${Date.now()}_${file.name}`;
                    return _supabase.storage.from('products').upload(filePath, file);
                });
                const uploadResults = await Promise.all(uploadPromises);
                const uploadErrors = uploadResults.filter(result => result.error);
                if (uploadErrors.length > 0) { throw new Error(`Error uploading images: ${uploadErrors.map(e => e.error.message).join(', ')}`); }

                const imageUrls = uploadResults.map(result => {
                    const { data: { publicUrl } } = _supabase.storage.from('products').getPublicUrl(result.data.path);
                    return publicUrl;
                });

                const title = document.getElementById('item-title')?.value;
                const description = document.getElementById('item-description')?.value;
                const price = document.getElementById('item-price')?.value;
                const category = document.getElementById('item-category')?.value;
                const location = document.getElementById('item-location')?.value;


                 if (!title || !price || !category) {
                     alert('Please fill in Title, Price, and Category.');
                     if (submitButton) {
                          submitButton.disabled = false;
                          submitButton.textContent = 'Create Business Listing';
                     }
                     return;
                 }


                const { error: insertError } = await _supabase.from('business_listings').insert({
                    title: title,
                    description: description,
                    price: price,
                    category: category,
                    location: location,
                    image_url: imageUrls,
                    seller_id: session.user.id
                });
                if (insertError) throw insertError;

                alert('Business listing created successfully!');
                window.location.href = 'business.html';

            } catch (error) {
                console.error('Error creating business listing:', error);
                alert('An error occurred: ' + error.message);
                if (submitButton) {
                     submitButton.disabled = false;
                     submitButton.textContent = 'Create Business Listing';
                }
            }
        });
    }

    // --- BUSINESS SELL PAGE - PAYMENT GATE (Access Check) ---
    if (document.querySelector('#business-sell-form')) {
        const checkBusinessAccess = async () => {
            const { data: { session }, error: sessionError } = await _supabase.auth.getSession();

            if (sessionError || !session) {
                alert('Please log in to create a business listing.');
                window.location.href = 'login.html';
                return;
            }

            const { data: profile, error: profileError } = await _supabase
                .from('profiles')
                .select('business_status')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile || profile.business_status !== 'active') {
                alert('You need an active business subscription to post a listing. Please upgrade your account.');
                window.location.href = 'payment.html';
                return;
            }

            console.log('Business access granted.');
        };
        checkBusinessAccess();
    }


    // --- *** START OF REPLACED BUSINESS BROWSE PAGE LOGIC (SCALABLE) *** ---
    const businessLayout = document.querySelector('#business-layout');
    if (businessLayout) {
           
           // --- PAYMENT GATING FOR CREATE BUTTON (No changes) ---
           const gateBusinessButton = async () => {
                const createListingBtn = document.getElementById('create-business-listing-btn');
                if (!createListingBtn) return; 

                const { data: { session } } = await _supabase.auth.getSession();

                if (session) {
                      const { data: profile, error } = await _supabase
                           .from('profiles')
                           .select('business_status')
                           .eq('id', session.user.id)
                           .single();

                      if (error && error.code !== 'PGRST116') { 
                           console.error("Error fetching profile status:", error);
                           createListingBtn.href = 'payment.html';
                           createListingBtn.textContent = 'Error Checking Status - Upgrade';
                           return;
                      }

                      if (profile && profile.business_status === 'active') {
                           createListingBtn.href = 'business_sell.html'; 
                           createListingBtn.textContent = 'Create Your Business Listing';
                      } else {
                           createListingBtn.href = 'payment.html';
                           createListingBtn.textContent = 'Upgrade to Post';
                      }
                 } else {
                      createListingBtn.href = 'login.html';
                      createListingBtn.textContent = 'Log in to Post';
                 }
           };
           gateBusinessButton();
           _supabase.auth.onAuthStateChange((event, session) => {
                console.log("Auth state changed:", event); 
                gateBusinessButton(); 
           });
           // --- END OF GATING LOGIC ---

        // --- 1. Get all filter elements ---
        const searchInput = document.getElementById('search-filter');
        const categoryRadios = businessLayout.querySelectorAll('input[name="category"]');
        const listingGrid = document.getElementById('business-listing-grid');
        const loadMoreBtn = document.getElementById('load-more-btn-business'); // Unique ID

        // --- 2. State variables ---
        let currentPage = 0;
        const itemsPerPage = 12; // Load 12 items at a time
        let isLoading = false;
        
        // --- 3. Main function to load listings ---
        const loadBusinessListings = async (isNewQuery = false) => {
            if (isLoading) return;
            isLoading = true;
            if (loadMoreBtn) loadMoreBtn.textContent = 'Loading...';

            if (isNewQuery) {
                currentPage = 0;
                listingGrid.innerHTML = '';
            }

            // --- 4. Get all filter values ---
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const checkedCategoryRadio = categoryRadios ? businessLayout.querySelector('input[name="category"]:checked') : null;
            const category = checkedCategoryRadio ? checkedCategoryRadio.value : 'all';

            // --- 5. Build the Supabase query ---
            let query = _supabase
                .from('business_listings')
                .select(`*, profiles!seller_id(full_name, avatar_url, business_name, business_logo_url)`);

            // Add server-side filters
            if (category !== 'all') {
                query = query.eq('category', category);
            }
            if (searchTerm) {
                query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
            }
            
            // NOTE: No price filter on this page

            // --- 6. Add pagination to the query ---
            const from = currentPage * itemsPerPage;
            const to = from + itemsPerPage - 1;
            query = query.range(from, to);

            // --- 7. Fetch data and render ---
            const { data: listings, error } = await query;

            if (error) {
                console.error('Error fetching business listings:', error);
                if (listingGrid) listingGrid.innerHTML = '<p>Could not load listings.</p>';
            } else {
                if (listings.length > 0) {
                    renderBusinessListings(listings); // Render the items
                    currentPage++; // Go to the next page for the *next* load
                }

                // Show or hide the "Load More" button
                if (loadMoreBtn) {
                    if (listings.length < itemsPerPage) {
                        loadMoreBtn.style.display = 'none'; // No more items
                    } else {
                        loadMoreBtn.style.display = 'block'; // More items exist
                    }
                }
                
                // Show "no results" message only on a new query
                if (isNewQuery && listings.length === 0) {
                    listingGrid.innerHTML = '<p>No business listings found matching your criteria.</p>';
                }
            }
            
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = 'Load More';
        };

        // --- 8. Render function (appends items) ---
        const renderBusinessListings = (listingsToRender) => {
             if (!listingGrid) return;

             listingsToRender.forEach(listing => {
                 const displayName = listing.profiles?.business_name || listing.profiles?.full_name || 'Campus Seller';
                 const displayImage = listing.profiles?.business_logo_url || listing.profiles?.avatar_url || 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
                 const firstImage = listing.image_url && listing.image_url.length > 0 ? listing.image_url[0] : 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';

                 const listingCardHTML = `
                     <div class="product-card-link">
                         <div class="product-card">
                             <a href="product.html?id=${listing.id}&type=business">
                                 <img src="${firstImage}" alt="${listing.title || 'Business Listing'}">
                             </a>
                             <div class="product-info">
                                 <h3><a href="product.html?id=${listing.id}&type=business">${listing.title || 'Untitled Listing'}</a></h3>
                                 <p class="price">From ₹${listing.price || 0}</p>
                                 <div class="product-card-footer">
                                     <div class="seller-info">
                                         <img src="${displayImage}" alt="${displayName}">
                                         <span>${displayName}</span>
                                     </div>
                                     <button class="btn-add-to-cart" data-id="${listing.id}" data-type="business"><i class='bx bx-cart-add'></i> Add to Cart</button>
                                 </div>
                             </div>
                         </div>
                     </div>`;
                 listingGrid.innerHTML += listingCardHTML; // Use += to append
             });
        };

        // --- 9. All Event Listeners ---
        
        // Function to call when any filter changes
        const handleFilterChange = () => {
            loadBusinessListings(true); // true = new query
        };
        
        // Add to Cart listener (uses event delegation)
        listingGrid.addEventListener('click', async (e) => {
            const button = e.target.closest('.btn-add-to-cart');
            if (button) {
                const productId = button.dataset.id;
                const itemType = button.dataset.type;
                const { data: { session } } = await _supabase.auth.getSession();
                if (!session) { alert('Please log in to add items to your cart.'); window.location.href = 'login.html'; return; }

                const { error } = await _supabase.from('cart_items').insert({ product_id: productId, user_id: session.user.id, item_type: itemType });
                if (error) {
                    if (error.code === '23505') { alert('This item is already in your cart.'); }
                    else { alert('Error adding item to cart: ' + error.message); }
                } else {
                    alert('Item added to cart!');
                    updateNavUI();
                }
            }
        });

        // Filter listeners
        if (searchInput) {
            searchInput.addEventListener('change', handleFilterChange);
        }
        if (categoryRadios) {
             categoryRadios.forEach(radio => radio.addEventListener('change', handleFilterChange));
        }

        // "Load More" button listener
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loadBusinessListings(false); // false = append
            });
        }

        // --- 10. Initial Load ---
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if (searchQuery && searchInput) {
            searchInput.value = searchQuery;
        }
        loadBusinessListings(true); // Load first page
    }
    // --- *** END OF REPLACED BUSINESS BROWSE PAGE LOGIC *** ---


    // --- Homepage Smart Search Redirect (DATABASE-POWERED) ---
    const heroSearchForm = document.querySelector('#hero-search-form');
    if (heroSearchForm) {
        heroSearchForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const searchInput = document.getElementById('hero-search-input');
             if (!searchInput) return;

            const searchTerm = searchInput.value.trim();
            const lowerSearchTerm = searchTerm.toLowerCase();

            if (!searchTerm) {
                window.location.href = 'browse.html';
                return;
            }

            try {
                 const { error: businessError, count: businessCount } = await _supabase 
                      .from('business_listings')
                      .select('id', { count: 'exact', head: true }) 
                      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

                 if (businessError) throw businessError; 

                 if (businessCount > 0) {
                      window.location.href = `business.html?q=${encodeURIComponent(searchTerm)}`;
                      return;
                 }

                 const { error: productError, count: productCount } = await _supabase 
                      .from('products')
                      .select('id', { count: 'exact', head: true }) 
                      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

                 if (productError) throw productError; 

                 if (productCount > 0) {
                      window.location.href = `browse.html?q=${encodeURIComponent(searchTerm)}`;
                      return;
                 }

                 const businessKeywords = [
                      'cake', 'food', 'homemade', 'meal', 'service',
                      'tutor', 'repair', 'laundry', 'custom', 'craft',
                      'art', 'design', 'handmade', 'drinks', 'flower'
                 ];
                 for (const keyword of businessKeywords) {
                      if (lowerSearchTerm.includes(keyword)) {
                           window.location.href = `business.html?q=${encodeURIComponent(searchTerm)}`;
                           return;
                      }
                 }

                 window.location.href = `browse.html?q=${encodeURIComponent(searchTerm)}`;

            } catch (error) {
                 console.error("Error during homepage search redirect:", error);
                 alert("Search failed due to an error. Redirecting to browse page.");
                 window.location.href = `browse.html?q=${encodeURIComponent(searchTerm)}`;
            }
        });
    }


    // --- SMOOTH SCROLL ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            const isHomepageHashLink = href.startsWith('#') && (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'));

            if (isHomepageHashLink) {
                 e.preventDefault();
                 const targetId = href;
                 try {
                      const targetElement = document.querySelector(targetId);
                      if (targetElement) {
                           const headerOffset = 80;
                           const elementPosition = targetElement.getBoundingClientRect().top;
                           const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                           window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth"
                           });
                      } else {
                           console.warn(`Smooth scroll target element not found: ${targetId}`);
                      }
                 } catch (error) {
                      console.error(`Error finding smooth scroll target: ${targetId}`, error);
                 }
            }
        });
    });

    // ---
    // --- DARK MODE TOGGLE LOGIC ---
    // ---
    const themeToggle = document.getElementById('theme-toggle');
    const systemSetting = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            if(themeToggle) themeToggle.checked = true;
        } else {
            document.body.setAttribute('data-theme', 'light');
            if(themeToggle) themeToggle.checked = false;
        }
    };

    const setTheme = (theme) => {
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    };

    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (systemSetting.matches) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                setTheme('dark');
            } else {
                setTheme('light');
            }
        });
    }

    systemSetting.addEventListener('change', (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        if (!localStorage.getItem('theme')) {
            applyTheme(newTheme);
        }
    });
    // --- END OF DARK MODE LOGIC ---

    // ---
    // --- FEATURED SPOTS COUNT FUNCTION (Defined globally for use below) ---
    // ---
    const checkFeaturedSpots = async () => {
        const spotsLeftEl = document.getElementById('feature-spots-left');
        if (!spotsLeftEl) return;

        const currentDate = new Date().toISOString(); 
        const totalSpots = 4;

        try {
            const { count, error } = await _supabase
                .from('business_listings')
                .select('*', { count: 'exact', head: true })
                .or(`is_featured.eq.true,reservation_expires_at.gt.${currentDate}`); 
            
            if (error) throw error;
            
            const spotsUsed = count || 0;
            const spotsAvailable = totalSpots - spotsUsed;

            if (spotsAvailable <= 0) {
                spotsLeftEl.textContent = "All 4 featured spots are full this month. Please check back later!";
                spotsLeftEl.style.color = "#ef4444"; // Red
            } else {
                spotsLeftEl.textContent = `${spotsAvailable} of 4 spots available for this month.`;
                spotsLeftEl.style.color = "#24b47e"; // Green
            }

        } catch (error) {
            console.error('Error fetching featured/reserved spots:', error);
            spotsLeftEl.textContent = "Could not load available spots. Please try again.";
        }
    };
    // --- END OF FEATURED SPOTS COUNT FUNCTION ---


    // ---
    // --- "GET FEATURED" PAGE LOGIC (featured.html) ---
    // ---
    const featuredPageLogic = document.querySelector('#featured-page-logic');
    if (featuredPageLogic) {
        const container = document.getElementById('my-business-listings-container');
        const submitBtn = document.getElementById('submit-feature-btn');
        let selectedListingId = null;

        const checkFeatureAccess = async () => {
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session) {
                alert('Please log in to manage your business listings.');
                window.location.href = 'login.html';
                return null;
            }

            const { data: profile } = await _supabase
                .from('profiles')
                .select('business_status')
                .eq('id', session.user.id)
                .single();

            if (!profile || profile.business_status !== 'active') {
                alert('You must have an active business account to purchase a feature. Please pay the one-time fee first.');
                window.location.href = 'payment.html';
                return null;
            }
            
            return session.user;
        };

        const loadMyBusinessListings = async (user) => {
            if (!user || !container) return;

            container.innerHTML = '<div class="loading-spinner">Loading Business Listings...</div>';
            
            const { data: listings, error } = await _supabase
                .from('business_listings')
                .select('id, title, image_url, is_featured, featured_until, reservation_expires_at')
                .eq('seller_id', user.id);

            if (error) {
                console.error('Error fetching business listings:', error);
                container.innerHTML = '<p>Could not load your listings.</p>';
                return;
            }
            
            if (listings.length === 0) {
                container.innerHTML = '<p>You have not created any business listings yet. Please create a listing before you can feature it.</p>';
                return;
            }

            container.innerHTML = '';
            const currentDate = new Date().toISOString();

            listings.forEach(item => {
                const firstImage = item.image_url && item.image_url.length > 0 ? item.image_url[0] : 'https://uwgeszjlcnrooxtihdpq.supabase.co/storage/v1/object/public/assets/default-avatar.jpg';
                const card = document.createElement('div');
                card.className = 'feature-select-card';
                card.dataset.id = item.id;
                
                const isCurrentlyFeatured = item.is_featured && item.featured_until && item.featured_until > currentDate;
                const isCurrentlyReserved = item.reservation_expires_at && item.reservation_expires_at > currentDate;

                let cardTitle = item.title;
                if (isCurrentlyFeatured) {
                    card.classList.add('selected'); 
                    cardTitle += " (Currently Featured)";
                } else if (isCurrentlyReserved) {
                    card.classList.add('reserved');
                    cardTitle += " (Reserved - Pending Payment)";
                    card.style.pointerEvents = 'none'; 
                }

                card.innerHTML = `
                    <img src="${firstImage}" alt="${item.title}">
                    <h4>${cardTitle}</h4>
                `;
                
                card.addEventListener('click', async () => { 
                    if (isCurrentlyFeatured) {
                        alert('This item is already featured and active.');
                        return;
                    }
                    if (isCurrentlyReserved) {
                         alert('This item is reserved and awaiting payment verification.');
                         return;
                    }

                    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    
                    const { error: reserveError } = await _supabase
                        .from('business_listings')
                        .update({ 
                            reservation_expires_at: expirationTime,
                            is_featured: false,
                        })
                        .eq('id', item.id)
                        .eq('seller_id', user.id);

                    if (reserveError) {
                        console.error("Error reserving spot:", reserveError);
                        alert("Error reserving spot. Please try again.");
                        return;
                    }

                    container.querySelectorAll('.feature-select-card').forEach(c => c.classList.remove('selected', 'reserved'));
                    card.classList.add('selected');
                    selectedListingId = item.id;
                    
                    checkFeaturedSpots(); 

                    if (submitBtn) {
                        submitBtn.textContent = 'Submit Payment Proof';
                        submitBtn.classList.remove('disabled');
                        
                        const formLink = "https://docs.google.com/forms/d/e/1FAIpQLScsbHBTueV7h-UB5MCz7zY5V_YzKjyWVdW705B9n1_tjl3_Xg/viewform";
                        const prefillId = "entry.1515399747"; 

                        submitBtn.href = `${formLink}?${prefillId}=${selectedListingId}`;
                    }
                });
                
                container.appendChild(card);
            });
        };
        
        (async () => {
            if (submitBtn) {
                submitBtn.classList.add('disabled');
                submitBtn.href = '#';
            }
            
            checkFeaturedSpots();
            
            const user = await checkFeatureAccess();
            if (user) {
                loadMyBusinessListings(user);
            }
        })();
    }
    // --- END OF "GET FEATURED" LOGIC ---


}); // End of DOMContentLoaded