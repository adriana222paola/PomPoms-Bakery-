/* === Pompompurin's Dessert App Logic === */
const APP = {
    state: {
        recipes: [],
        pantry: [],
        logs: [],
        shopping: [],
        filter: { query: '', category: 'All' },
        sort: 'newest'
    },

    init: async () => {
        try {
            await DB.open();
            APP.state.recipes = await DB.getAll(DB.STORES.RECIPES);
            APP.state.pantry = await DB.getAll(DB.STORES.PANTRY);
            APP.state.logs = await DB.getAll(DB.STORES.LOGS);
            APP.state.shopping = await DB.getAll(DB.STORES.SHOPPING);
            APP.renderRecipes();
            APP.renderPantry();
            APP.renderLogs();
            APP.renderShopping();
            APP.loadTheme();
        } catch (e) {
            console.error(e);
            alert('Error loading database');
        }
    },

    /* --- Navigation --- */
    nav: (id) => {
        document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[onclick*="${id}"]`);
        if(activeBtn) activeBtn.classList.add('active');
        
        window.scrollTo(0,0);
    },

    toggleTheme: () => {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('dessert_theme', newTheme);
        APP.updateThemeButton(newTheme);
    },

    loadTheme: () => {
        const theme = localStorage.getItem('dessert_theme') || 'light';
        document.body.setAttribute('data-theme', theme);
        APP.updateThemeButton(theme);
    },

    updateThemeButton: (theme) => {
        const btn = document.getElementById('theme-btn');
        if(btn) {
            btn.innerText = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
        }
    },

    /* --- Recipes CRUD --- */
    saveRecipe: async () => {
        const id = document.getElementById('recId').value || Date.now();
        const title = document.getElementById('recTitle').value;
        if (!title) return alert('Pompompurin needs a recipe name!');

        const file = document.getElementById('recImg').files[0];
        
        const processSave = async (imgData) => {
            const recipe = {
                id: parseInt(id),
                title,
                desc: document.getElementById('recDesc').value,
                ingredients: document.getElementById('recIng').value,
                instructions: document.getElementById('recInst').value,
                time: parseInt(document.getElementById('recTime').value) || 0,
                temp: parseInt(document.getElementById('recTemp').value) || 0,
                servings: parseInt(document.getElementById('recServ').value) || 1,
                category: document.getElementById('recCat').value,
                notes: document.getElementById('recNotes').value,
                image: imgData || document.getElementById('recExistingImg').value || null,
                date: new Date().toISOString()
            };

            await DB.save(DB.STORES.RECIPES, recipe);
            APP.state.recipes = await DB.getAll(DB.STORES.RECIPES);
            APP.renderRecipes();
            APP.nav('tab-recipes');
            APP.clearForm();
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = e => processSave(e.target.result);
            reader.readAsDataURL(file);
        } else {
            processSave(null);
        }
    },

    deleteRecipe: async (id) => {
        if(!confirm('Are you sure you want to delete this sweet treat?')) return;
        await DB.deleteItem(DB.STORES.RECIPES, id);
        APP.state.recipes = await DB.getAll(DB.STORES.RECIPES);
        APP.renderRecipes();
        APP.nav('tab-recipes');
    },

    editRecipe: (id) => {
        const r = APP.state.recipes.find(i => i.id === id);
        if(!r) return;

        document.getElementById('recId').value = r.id;
        document.getElementById('recTitle').value = r.title;
        document.getElementById('recDesc').value = r.desc;
        document.getElementById('recIng').value = r.ingredients;
        document.getElementById('recInst').value = r.instructions;
        document.getElementById('recTime').value = r.time;
        document.getElementById('recTemp').value = r.temp;
        document.getElementById('recServ').value = r.servings;
        document.getElementById('recCat').value = r.category;
        document.getElementById('recNotes').value = r.notes;
        document.getElementById('recExistingImg').value = r.image || '';
        
        document.getElementById('formTitle').innerText = 'Edit Recipe';
        APP.nav('tab-add');
    },

    clearForm: () => {
        document.getElementById('recipeForm').reset();
        document.getElementById('recId').value = '';
        document.getElementById('recExistingImg').value = '';
        document.getElementById('formTitle').innerText = 'New Sweet Recipe';
    },

    /* --- Pantry Tracker --- */
    savePantryItem: async () => {
        const id = Date.now();
        const name = document.getElementById('panName').value;
        const qty = document.getElementById('panQty').value;
        if(!name) return;

        const item = { id, name, qty };
        await DB.save(DB.STORES.PANTRY, item);
        APP.state.pantry = await DB.getAll(DB.STORES.PANTRY);
        APP.renderPantry();
        document.getElementById('panName').value = '';
        document.getElementById('panQty').value = '';
    },

    deletePantryItem: async (id) => {
        await DB.deleteItem(DB.STORES.PANTRY, id);
        APP.state.pantry = await DB.getAll(DB.STORES.PANTRY);
        APP.renderPantry();
    },

    updatePantryQty: async (id, delta) => {
        const item = APP.state.pantry.find(i => i.id === id);
        if(!item) return;

        // Try to parse number from qty string (e.g., "500g" -> 500)
        const match = item.qty.match(/^(\d+(\.\d+)?)(.*)$/);
        if(match) {
            const currentVal = parseFloat(match[1]);
            const unit = match[3] || '';
            const newVal = Math.max(0, currentVal + delta);
            item.qty = `${newVal}${unit}`;
            
            await DB.save(DB.STORES.PANTRY, item);
            APP.renderPantry();
        } else {
            const newVal = prompt('Enter new quantity:', item.qty);
            if(newVal !== null) {
                item.qty = newVal;
                await DB.save(DB.STORES.PANTRY, item);
                APP.renderPantry();
            }
        }
    },

    addToShoppingFromPantry: async (id) => {
        const item = APP.state.pantry.find(i => i.id === id);
        if(!item) return;
        
        const shoppingItem = {
            id: Date.now(),
            name: item.name,
            qty: item.qty,
            checked: false
        };
        
        await DB.save(DB.STORES.SHOPPING, shoppingItem);
        APP.state.shopping = await DB.getAll(DB.STORES.SHOPPING);
        APP.renderShopping();
        alert(`${item.name} added to Shopping List! 🛒`);
    },

    renderPantry: () => {
        const container = document.getElementById('pantryList');
        const getIcon = (name) => {
            const n = name.toLowerCase();
            if(n.includes('flour')) return '🌾';
            if(n.includes('sugar') || n.includes('sweetener')) return '🍬';
            if(n.includes('egg')) return '🥚';
            if(n.includes('milk') || n.includes('dairy')) return '🥛';
            if(n.includes('butter') || n.includes('margarine')) return '🧈';
            if(n.includes('chocolate') || n.includes('cocoa')) return '🍫';
            if(n.includes('vanilla') || n.includes('extract')) return '🍦';
            if(n.includes('fruit') || n.includes('berry') || n.includes('strawberry')) return '🍓';
            if(n.includes('yeast') || n.includes('powder') || n.includes('baking')) return '✨';
            if(n.includes('water')) return '💧';
            if(n.includes('oil')) return '🧪';
            if(n.includes('salt')) return '🧂';
            return '📦';
        };

        container.className = 'pantry-grid';
        container.innerHTML = APP.state.pantry.map(i => `
            <div class="pantry-card">
                <span class="pantry-icon">${getIcon(i.name)}</span>
                <span class="pantry-name">${i.name}</span>
                <span class="pantry-qty">${i.qty}</span>
                <div class="pantry-actions">
                    <button class="btn-mini" onclick="APP.updatePantryQty(${i.id}, -1)">-</button>
                    <button class="btn-mini" onclick="APP.updatePantryQty(${i.id}, 1)">+</button>
                    <button class="btn-mini" onclick="APP.addToShoppingFromPantry(${i.id})" title="Add to Shopping List">🛒</button>
                    <button class="btn-mini" onclick="APP.deletePantryItem(${i.id})" style="background:var(--danger-bg); color:var(--danger);">✕</button>
                </div>
            </div>
        `).join('');
    },

    /* --- Shopping List --- */
    saveShoppingItem: async () => {
        const id = Date.now();
        const name = document.getElementById('shopName').value;
        const qty = document.getElementById('shopQty').value;
        if(!name) return;

        const item = { id, name, qty, checked: false };
        await DB.save(DB.STORES.SHOPPING, item);
        APP.state.shopping = await DB.getAll(DB.STORES.SHOPPING);
        APP.renderShopping();
        document.getElementById('shopName').value = '';
        document.getElementById('shopQty').value = '';
    },

    toggleShoppingItem: async (id) => {
        const item = APP.state.shopping.find(i => i.id === id);
        if(!item) return;
        item.checked = !item.checked;
        await DB.save(DB.STORES.SHOPPING, item);
        APP.renderShopping();
    },

    deleteShoppingItem: async (id) => {
        await DB.deleteItem(DB.STORES.SHOPPING, id);
        APP.state.shopping = await DB.getAll(DB.STORES.SHOPPING);
        APP.renderShopping();
    },

    completeShopping: async () => {
        const checkedItems = APP.state.shopping.filter(i => i.checked);
        if(checkedItems.length === 0) return alert('No items checked!');

        for(const item of checkedItems) {
            // Check if item already exists in pantry
            const existingPantry = APP.state.pantry.find(p => p.name.toLowerCase() === item.name.toLowerCase());
            if(existingPantry) {
                // Update existing quantity if possible
                const matchOld = existingPantry.qty.match(/^(\d+(\.\d+)?)(.*)$/);
                const matchNew = item.qty.match(/^(\d+(\.\d+)?)(.*)$/);
                
                if(matchOld && matchNew) {
                    const newVal = parseFloat(matchOld[1]) + parseFloat(matchNew[1]);
                    existingPantry.qty = `${newVal}${matchOld[3] || ''}`;
                    await DB.save(DB.STORES.PANTRY, existingPantry);
                } else {
                    existingPantry.qty += ` + ${item.qty}`;
                    await DB.save(DB.STORES.PANTRY, existingPantry);
                }
            } else {
                // Add new pantry item
                await DB.save(DB.STORES.PANTRY, { id: Date.now() + Math.random(), name: item.name, qty: item.qty });
            }
            // Delete from shopping
            await DB.deleteItem(DB.STORES.SHOPPING, item.id);
        }

        APP.state.pantry = await DB.getAll(DB.STORES.PANTRY);
        APP.state.shopping = await DB.getAll(DB.STORES.SHOPPING);
        APP.renderPantry();
        APP.renderShopping();
        alert('Items moved to Pantry! 🥚');
    },

    renderShopping: () => {
        const container = document.getElementById('shoppingList');
        container.innerHTML = APP.state.shopping.map(i => `
            <div class="shopping-item ${i.checked ? 'checked' : ''}" onclick="APP.toggleShoppingItem(${i.id})">
                <div style="display:flex; align-items:center; gap:20px;">
                    <div class="checkbox-custom">
                        ${i.checked ? '✓' : ''}
                    </div>
                    <div>
                        <strong style="font-size:1.2rem; color:var(--pom-brown);">${i.name}</strong>
                        <div style="font-size:0.9rem; color:var(--text-light); font-weight:600;">${i.qty}</div>
                    </div>
                </div>
                <button class="btn-mini" onclick="event.stopPropagation(); APP.deleteShoppingItem(${i.id})" style="background:var(--danger-bg); color:var(--danger); width:40px; height:40px; font-size:1.2rem;">✕</button>
            </div>
        `).join('');
    },

    /* --- Baking Log --- */
    saveLog: async () => {
        const id = Date.now();
        const title = document.getElementById('logTitle').value;
        const note = document.getElementById('logNote').value;
        if(!title) return;

        const log = { id, title, note, date: new Date().toISOString() };
        await DB.save(DB.STORES.LOGS, log);
        APP.state.logs = await DB.getAll(DB.STORES.LOGS);
        APP.renderLogs();
        document.getElementById('logTitle').value = '';
        document.getElementById('logNote').value = '';
    },

    deleteLog: async (id) => {
        await DB.deleteItem(DB.STORES.LOGS, id);
        APP.state.logs = await DB.getAll(DB.STORES.LOGS);
        APP.renderLogs();
    },

    renderLogs: () => {
        const container = document.getElementById('logsList');
        container.innerHTML = APP.state.logs.sort((a,b) => new Date(b.date) - new Date(a.date)).map(l => `
            <div class="card" style="margin-bottom:15px; padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <small style="color:var(--text-light); font-weight:700;">${new Date(l.date).toLocaleDateString()}</small>
                        <h3 style="margin:5px 0;">${l.title}</h3>
                    </div>
                    <button class="btn-danger" onclick="APP.deleteLog(${l.id})">🗑️</button>
                </div>
                <p style="margin:10px 0 0 0; color:var(--text-light);">${l.note}</p>
            </div>
        `).join('');
    },

    /* --- Dynamic Portions --- */
    updatePortions: (newServings, originalServings) => {
        if(!newServings || newServings < 1 || !originalServings) return;
        const ratio = newServings / originalServings;
        const ingredientList = document.getElementById('detailIngredients');
        if (!ingredientList) return;
        
        const items = ingredientList.querySelectorAll('li');
        
        items.forEach(li => {
            const originalText = li.getAttribute('data-original');
            // Regex to find the first number (integer or decimal) in the string
            const updatedText = originalText.replace(/(\d+(\.\d+)?)/, (match) => {
                const newVal = parseFloat(match) * ratio;
                // Return integer if possible, otherwise 1 decimal place
                return Number.isInteger(newVal) ? newVal : newVal.toFixed(1);
            });
            li.innerText = updatedText;
        });
    },

    /* --- View & Filter --- */
    renderRecipes: () => {
        const container = document.getElementById('recipeGrid');
        const query = document.getElementById('searchBar').value.toLowerCase();
        const cat = document.getElementById('filterCat').value;
        const sort = document.getElementById('sortOrder').value;

        let filtered = APP.state.recipes.filter(r => {
            const matchQuery = r.title.toLowerCase().includes(query) || r.ingredients.toLowerCase().includes(query);
            const matchCat = cat === 'All' || r.category === cat;
            return matchQuery && matchCat;
        });

        if (sort === 'newest') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
        if (sort === 'oldest') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
        if (sort === 'az') filtered.sort((a,b) => a.title.localeCompare(b.title));
        if (sort === 'time') filtered.sort((a,b) => a.time - b.time);

        container.innerHTML = filtered.map(r => `
            <div class="card" onclick="APP.viewRecipe(${r.id})">
                <img src="${r.image || 'img/placeholder_pudding.svg'}" class="recipe-img">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <h3 style="margin-bottom:5px;">${r.title}</h3>
                    <span class="tag">${r.time}m</span>
                </div>
                <p style="color:var(--text-light); font-size:0.9rem; line-height:1.4;">${r.desc.substring(0, 60)}...</p>
                <div style="margin-top:10px;">
                    <span class="tag tag-${r.category.toLowerCase()}">${r.category}</span>
                    <span style="font-size:0.8rem; color:var(--text-light); font-weight:700;">• ${r.servings} Servings</span>
                </div>
            </div>
        `).join('');
    },

    viewRecipe: (id) => {
        const r = APP.state.recipes.find(i => i.id === id);
        if(!r) return;

        const view = document.getElementById('recipeDetailView');
        view.innerHTML = `
            <button class="nav-btn" onclick="APP.nav('tab-recipes')" style="margin-bottom:20px;">&larr; Back to Recipes</button>
            <div class="card">
                <img src="${r.image || 'img/placeholder_pudding.svg'}" style="width:100%; height:300px; object-fit:cover; border-radius:12px; margin-bottom:20px;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <h1 style="margin:0; font-size:2.5rem;">${r.title}</h1>
                    <div style="display:flex; gap:10px;">
                        <button class="nav-btn" onclick="APP.editRecipe(${r.id})">✏️ Edit</button>
                        <button class="nav-btn" onclick="APP.deleteRecipe(${r.id})" style="color:red;">🗑️ Delete</button>
                    </div>
                </div>

                <div class="flex-row" style="margin: 20px 0; gap:15px; flex-wrap:wrap;">
                    <div class="tag">⏱️ ${r.time} mins</div>
                    <div class="tag">🌡️ ${r.temp}°F</div>
                    <div class="tag tag-${r.category.toLowerCase()}">📂 ${r.category}</div>
                </div>

                <div style="background:var(--sponge-yellow); padding:15px; border-radius:15px; display:flex; align-items:center; gap:15px; margin-bottom:20px;">
                    <label style="margin:0; white-space:nowrap;">Adjust Servings:</label>
                    <input type="number" value="${r.servings}" min="1" oninput="APP.updatePortions(this.value, ${r.servings})" style="width:80px; margin:0; padding:8px;">
                </div>

                <p style="font-size:1.1rem; line-height:1.6; color:var(--text-light);">${r.desc}</p>

                <div class="grid" style="grid-template-columns: 1fr 2fr; margin-top:30px; gap:40px;">
                    <div>
                        <h3 style="color:var(--accent);">Ingredients</h3>
                        <ul id="detailIngredients" style="line-height:1.8; padding-left:20px;">
                            ${r.ingredients.split('\n').map(i => i.trim() ? `<li data-original="${i}">${i}</li>` : '').join('')}
                        </ul>
                    </div>
                    <div>
                        <h3 style="color:var(--accent);">Instructions</h3>
                        <div style="white-space:pre-wrap; line-height:1.8;">${r.instructions}</div>
                    </div>
                </div>

                <div style="margin-top:40px; background:var(--bg-body); padding:20px; border-radius:12px; border:2px dashed var(--border);">
                    <h3 style="margin-top:0;">📝 Chef's Notes & Modifications</h3>
                    <p>${r.notes || 'No notes added yet.'}</p>
                </div>
            </div>
        `;
        APP.nav('tab-detail');
    },

    /* --- Data Management (Backup/Restore) --- */
    exportData: async () => {
        const data = {
            recipes: await DB.getAll(DB.STORES.RECIPES),
            pantry: await DB.getAll(DB.STORES.PANTRY),
            logs: await DB.getAll(DB.STORES.LOGS),
            shopping: await DB.getAll(DB.STORES.SHOPPING),
            settings: {
                theme: localStorage.getItem('dessert_theme') || 'light'
            },
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PompomBakery_Backup_${new Date().toLocaleDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        APP.showToast('Backup downloaded! 📦');
    },

    importData: async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!confirm('This will overwrite your current data. Are you sure?')) return;

                // Clear current stores
                for (const store of Object.values(DB.STORES)) {
                    const allItems = await DB.getAll(store);
                    for (const item of allItems) {
                        await DB.deleteItem(store, item.id);
                    }
                }

                // Import new data
                for (const item of data.recipes || []) await DB.save(DB.STORES.RECIPES, item);
                for (const item of data.pantry || []) await DB.save(DB.STORES.PANTRY, item);
                for (const item of data.logs || []) await DB.save(DB.STORES.LOGS, item);
                for (const item of data.shopping || []) await DB.save(DB.STORES.SHOPPING, item);

                if (data.settings?.theme) {
                    localStorage.setItem('dessert_theme', data.settings.theme);
                }

                alert('Data imported successfully! Reloading...');
                location.reload();
            } catch (err) {
                console.error(err);
                alert('Error importing file. Make sure it is a valid PompomBakery backup.');
            }
        };
        reader.readAsText(file);
    },

    showToast: (msg) => {
        const toast = document.createElement('div');
        toast.style = 'position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:var(--pom-brown); color:white; padding:12px 25px; border-radius:30px; z-index:1000; font-weight:700; box-shadow:var(--shadow); transition:0.3s; opacity:0;';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.style.opacity = '1', 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /* --- Converters --- */
    convertTemp: (dir) => {
        if(dir === 'f2c') {
            const f = parseFloat(document.getElementById('conv-f').value);
            if(!isNaN(f)) document.getElementById('conv-c').value = Math.round((f - 32) * 5/9);
        } else {
            const c = parseFloat(document.getElementById('conv-c').value);
            if(!isNaN(c)) document.getElementById('conv-f').value = Math.round((c * 9/5) + 32);
        }
    },

    convertTime: (dir) => {
         if(dir === 'm2h') {
            const m = parseFloat(document.getElementById('conv-min').value);
            if(!isNaN(m)) document.getElementById('conv-hr').value = (m / 60).toFixed(2);
        } else {
            const h = parseFloat(document.getElementById('conv-hr').value);
            if(!isNaN(h)) document.getElementById('conv-min').value = Math.round(h * 60);
        }
    },

    convert: (type) => {
        if(type === 'c2g') {
            const val = parseFloat(document.getElementById('conv-c2g-in').value) || 0;
            document.getElementById('conv-c2g-out').innerText = `${Math.round(val * 120)}g (Flour) / ${Math.round(val * 200)}g (Sugar)`;
        }
    }
};

document.addEventListener('DOMContentLoaded', APP.init);
