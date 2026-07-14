"use strict";

const telegram = window.Telegram?.WebApp;

const state = {
    selectedCategory: "Все","use strict";

const telegram = window.Telegram?.WebApp;

let products = [];

const state = {
    selectedCategory: "Все",
    selectedOperation: "order",
    cart: []
};

const elements = {
    userName: document.getElementById("userName"),
    shopSelect: document.getElementById("shopSelect"),
    productSearch: document.getElementById("productSearch"),
    categories: document.getElementById("categories"),
    productsList: document.getElementById("productsList"),
    productsCount: document.getElementById("productsCount"),
    cartList: document.getElementById("cartList"),
    emptyCart: document.getElementById("emptyCart"),
    cartBadge: document.getElementById("cartBadge"),
    totalPositions: document.getElementById("totalPositions"),
    totalQuantity: document.getElementById("totalQuantity"),
    clearCartButton: document.getElementById("clearCartButton"),
    sendOrderButton: document.getElementById("sendOrderButton"),
    orderComment: document.getElementById("orderComment"),
    toast: document.getElementById("toast")
};

initializeApp();

async function initializeApp() {
    loadCart();
    initializeTelegram();
    renderUser();
    renderShops();
    bindEvents();

    await loadProducts();

    renderProducts();
    renderCart();
}

async function loadProducts() {
    try {
        elements.productsList.innerHTML = `
            <div class="no-products">
                Загрузка товаров...
            </div>
        `;

        const response = await fetch(
            `products.json?v=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Ошибка загрузки: ${response.status}`
            );
        }

        const loadedProducts = await response.json();

        if (!Array.isArray(loadedProducts)) {
            throw new Error(
                "Неправильный формат products.json"
            );
        }

        products = loadedProducts;

        console.log(
            `Загружено товаров: ${products.length}`
        );
    } catch (error) {
        console.error(
            "Ошибка загрузки товаров:",
            error
        );

        products = [];

        elements.productsList.innerHTML = `
            <div class="no-products">
                Не удалось загрузить товары
            </div>
        `;

        showToast(
            "Не удалось загрузить товары",
            "error"
        );
    }
}   

function initializeTelegram() {
    if (!telegram) {
        console.log("Приложение открыто вне Telegram");
        return;
    }

    telegram.ready();
    telegram.expand();

    if (typeof telegram.disableVerticalSwipes === "function") {
        telegram.disableVerticalSwipes();
    }

    configureTelegramMainButton();
}

function configureTelegramMainButton() {
    if (!telegram?.MainButton) {
        return;
    }

    telegram.MainButton.setText("ОТПРАВИТЬ ЗАКАЗ");
    telegram.MainButton.setParams({
        color: "#2d8cff",
        text_color: "#ffffff",
        is_active: true,
        is_visible: true
    });

    telegram.MainButton.onClick(sendOrder);
}

function renderUser() {
    const telegramUser = telegram?.initDataUnsafe?.user;

    if (!telegramUser) {
        elements.userName.textContent = "Тестовый пользователь";
        return;
    }

    const fullName = [
        telegramUser.first_name,
        telegramUser.last_name
    ]
        .filter(Boolean)
        .join(" ");

    elements.userName.textContent =
        fullName || telegramUser.username || `ID: ${telegramUser.id}`;
}

function renderShops() {
    const sortedShops = [...shops].sort((a, b) =>
        a.name.localeCompare(b.name, "ru")
    );

    sortedShops.forEach((shop) => {
        const option = document.createElement("option");

        option.value = shop.id;
        option.textContent = shop.name;

        elements.shopSelect.appendChild(option);
    });
}

function renderCategories() {
    const productCategories = products.map((product) => product.category);
    const uniqueCategories = ["Все", ...new Set(productCategories)];

    elements.categories.innerHTML = "";

    uniqueCategories.forEach((category) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "category-button";
        button.textContent = category;
        button.dataset.category = category;

        if (category === state.selectedCategory) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            state.selectedCategory = category;

            renderCategories();
            renderProducts();
        });

        elements.categories.appendChild(button);
    });
}

function getFilteredProducts() {
    const searchText = normalizeText(
        elements.productSearch.value
    );

    return products.filter((product) => {
        const productSearchValue = normalizeText(
            `${product.name} ${product.article}`
        );

        return (
            searchText.length === 0 ||
            productSearchValue.includes(searchText)
        );
    });
}

function renderProducts() {
    const filteredProducts = getFilteredProducts();

    elements.productsList.innerHTML = "";
    elements.productsCount.textContent =
        `${filteredProducts.length} позиций`;

    if (filteredProducts.length === 0) {
        elements.productsList.innerHTML = `
            <div class="no-products">
                Товары не найдены
            </div>
        `;

        return;
    }

    filteredProducts.forEach((product) => {
        const productElement = createProductElement(product);
        elements.productsList.appendChild(productElement);
    });
}

function createProductElement(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const itemInCart = state.cart.find(
        (item) => item.productId === product.id
    );

    const isAvailable = product.isAvailable === true;

    const availabilityHtml = isAvailable
        ? `
            <div class="availability available">
                🟢 В наличии
            </div>
        `
        : `
            <div class="availability unavailable">
                🔴 Нет в наличии
            </div>
        `;

    const cartInfo = itemInCart
        ? `
            <div class="product-in-cart">
                В корзине:
                ${formatQuantity(itemInCart.quantity)}
                ${escapeHtml(product.unit)}
            </div>
        `
        : "";

    card.innerHTML = `
        <div class="product-top">
            <div class="product-info">
                <h3 class="product-name">
                    ${escapeHtml(product.name)}
                </h3>

                <div class="product-meta">
                    <span class="product-code">
                        Артикул:
                        ${escapeHtml(product.article)}
                    </span>

                    <span class="product-unit">
                        Ед.:
                        ${escapeHtml(product.unit)}
                    </span>
                </div>

                ${availabilityHtml}
                ${cartInfo}
            </div>
        </div>

        <div class="product-controls">
            <div class="quantity-control">
                <button
                    type="button"
                    class="quantity-button minus-button"
                    ${isAvailable ? "" : "disabled"}
                >
                    −
                </button>

                <input
                    type="number"
                    class="quantity-input"
                    value="${product.step}"
                    min="${product.step}"
                    step="${product.step}"
                    inputmode="decimal"
                    ${isAvailable ? "" : "disabled"}
                >

                <button
                    type="button"
                    class="quantity-button plus-button"
                    ${isAvailable ? "" : "disabled"}
                >
                    +
                </button>
            </div>

            <button
                type="button"
                class="add-button"
                ${isAvailable ? "" : "disabled"}
            >
                ${
                    isAvailable
                        ? "Добавить"
                        : "Нет в наличии"
                }
            </button>
        </div>
    `;

    if (!isAvailable) {
        card.classList.add("product-unavailable");
        return card;
    }

    const quantityInput =
        card.querySelector(".quantity-input");

    const minusButton =
        card.querySelector(".minus-button");

    const plusButton =
        card.querySelector(".plus-button");

    const addButton =
        card.querySelector(".add-button");

    minusButton.addEventListener("click", () => {
        const currentValue = parseQuantity(
            quantityInput.value
        );

        const newValue = Math.max(
            product.step,
            currentValue - product.step
        );

        quantityInput.value = formatInputQuantity(
            newValue,
            product.step
        );
    });

    plusButton.addEventListener("click", () => {
        const currentValue = parseQuantity(
            quantityInput.value
        );

        const newValue =
            currentValue + product.step;

        quantityInput.value = formatInputQuantity(
            newValue,
            product.step
        );
    });

    quantityInput.addEventListener("change", () => {
        let quantity = parseQuantity(
            quantityInput.value
        );

        if (quantity < product.step) {
            quantity = product.step;
        }

        quantityInput.value = formatInputQuantity(
            quantity,
            product.step
        );
    });

    addButton.addEventListener("click", () => {
        const quantity = parseQuantity(
            quantityInput.value
        );

        addToCart(product, quantity);
    });

    return card;
}

function addToCart(product, quantity) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
        showToast("Введите правильное количество", "error");
        return;
    }

    const existingItem = state.cart.find(
        (item) => item.productId === product.id
    );

    if (existingItem) {
        existingItem.quantity = roundQuantity(
            existingItem.quantity + quantity
        );
    } else {
        state.cart.push({
            productId: product.id,
            article: product.article,
            name: product.name,
            unit: product.unit,
            quantity: roundQuantity(quantity)
        });
    }

    saveCart();
    renderCart();
    renderProducts();

    triggerHaptic("success");
    showToast(`${product.name} добавлен`, "success");
}

function renderCart() {
    elements.cartList.innerHTML = "";

    const cartIsEmpty = state.cart.length === 0;

    elements.emptyCart.style.display =
        cartIsEmpty ? "block" : "none";

    elements.clearCartButton.style.display =
        cartIsEmpty ? "none" : "inline-block";

    state.cart.forEach((item) => {
        const cartItem = document.createElement("div");
        cartItem.className = "cart-item";

        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${escapeHtml(item.name)}
                </div>

                <div class="cart-item-quantity">
                    ${formatQuantity(item.quantity)}
                    ${escapeHtml(item.unit)}
                </div>
            </div>

            <button
                type="button"
                class="remove-cart-button"
                aria-label="Удалить товар"
            >
                ✕
            </button>
        `;

        const removeButton = cartItem.querySelector(
            ".remove-cart-button"
        );

        removeButton.addEventListener("click", () => {
            removeFromCart(item.productId);
        });

        elements.cartList.appendChild(cartItem);
    });

    updateSummary();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(
        (item) => item.productId !== productId
    );

    saveCart();
    renderCart();
    renderProducts();

    triggerHaptic("warning");
}

function clearCart() {
    if (state.cart.length === 0) {
        return;
    }

    const confirmed = confirm("Очистить всю корзину?");

    if (!confirmed) {
        return;
    }

    state.cart = [];

    saveCart();
    renderCart();
    renderProducts();

    showToast("Корзина очищена");
}

function updateSummary() {
    const totalPositions = state.cart.length;

    const totalQuantity = state.cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    elements.cartBadge.textContent = totalPositions;
    elements.totalPositions.textContent = totalPositions;
    elements.totalQuantity.textContent =
        formatQuantity(totalQuantity);

    elements.sendOrderButton.disabled = totalPositions === 0;

    if (telegram?.MainButton) {
        if (totalPositions === 0) {
            telegram.MainButton.disable();
        } else {
            telegram.MainButton.enable();
        }

        telegram.MainButton.setText(
            totalPositions === 0
                ? "КОРЗИНА ПУСТА"
                : `ОТПРАВИТЬ ЗАКАЗ · ${totalPositions}`
        );
    }
}

function bindEvents() {
    elements.productSearch.addEventListener("input", renderProducts);

    elements.clearCartButton.addEventListener("click", clearCart);

    elements.sendOrderButton.addEventListener("click", sendOrder);

    document
        .querySelectorAll(".operation-button")
        .forEach((button) => {
            button.addEventListener("click", () => {
                document
                    .querySelectorAll(".operation-button")
                    .forEach((item) => item.classList.remove("active"));

                button.classList.add("active");

                state.selectedOperation =
                    button.dataset.operation;
            });
        });
}

function sendOrder() {
    const selectedShopId = Number(elements.shopSelect.value);

    const selectedShop = shops.find(
        (shop) => shop.id === selectedShopId
    );

    if (!selectedShop) {
        showToast("Выберите торговую точку", "error");
        elements.shopSelect.focus();
        triggerHaptic("error");
        return;
    }

    if (state.cart.length === 0) {
        showToast("Добавьте товары в корзину", "error");
        triggerHaptic("error");
        return;
    }

    const telegramUser = telegram?.initDataUnsafe?.user;

    const order = {
        orderId: createOrderId(),

        operationType: state.selectedOperation,

        shop: {
            id: selectedShop.id,
            name: selectedShop.name
        },

        salesRepresentative: {
            telegramId: telegramUser?.id ?? null,
            username: telegramUser?.username ?? null,
            firstName: telegramUser?.first_name ?? "Не указан",
            lastName: telegramUser?.last_name ?? ""
        },

        items: state.cart.map((item) => ({
            productId: item.productId,
            article: item.article,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity
        })),

        comment: elements.orderComment.value.trim(),

        createdAt: new Date().toISOString()
    };

    const json = JSON.stringify(order);

    console.log("Заказ:", order);
    console.log("JSON:", json);

    /*
     * При обычном открытии через браузер
     * telegram.platform обычно равен "unknown".
     */
    const openedOutsideTelegram =
        !telegram || telegram.platform === "unknown";

    if (openedOutsideTelegram) {
        showOrderForBrowserTesting(json);
        return;
    }

    try {
        telegram.sendData(json);

        state.cart = [];
        saveCart();
        renderCart();
        renderProducts();

        elements.orderComment.value = "";

        triggerHaptic("success");
    } catch (error) {
        console.error("Ошибка отправки заказа:", error);

        showToast(
            "Не удалось отправить заказ",
            "error"
        );

        triggerHaptic("error");
    }
}

function showOrderForBrowserTesting(json) {
    const formattedJson = JSON.stringify(
        JSON.parse(json),
        null,
        2
    );

    console.log(formattedJson);

    alert(
        "Mini App открыт вне Telegram.\n\n" +
        "Заказ сформирован правильно.\n" +
        "Откройте консоль браузера, чтобы увидеть JSON."
    );

    showToast("Тестовый заказ сформирован", "success");
}

function saveCart() {
    try {
        localStorage.setItem(
            "viar-mini-app-cart",
            JSON.stringify(state.cart)
        );
    } catch (error) {
        console.warn("Не удалось сохранить корзину:", error);
    }
}

function loadCart() {
    try {
        const savedCart = localStorage.getItem(
            "viar-mini-app-cart"
        );

        if (!savedCart) {
            return;
        }

        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
            state.cart = parsedCart;
        }
    } catch (error) {
        console.warn("Не удалось загрузить корзину:", error);
        state.cart = [];
    }
}

function createOrderId() {
    const datePart = new Date()
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14);

    const randomPart = Math.floor(
        1000 + Math.random() * 9000
    );

    return `ORDER-${datePart}-${randomPart}`;
}

function normalizeText(value) {
    return String(value)
        .toLowerCase()
        .trim()
        .replaceAll("ё", "е")
        .replaceAll("і", "и")
        .replaceAll("ї", "и");
}

function parseQuantity(value) {
    const normalizedValue = String(value)
        .replace(",", ".")
        .trim();

    const result = Number.parseFloat(normalizedValue);

    return Number.isFinite(result) ? result : 0;
}

function roundQuantity(value) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatQuantity(value) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 3
    }).format(value);
}

function formatInputQuantity(value, step) {
    const decimals = getDecimalsCount(step);

    return roundQuantity(value).toFixed(decimals);
}

function getDecimalsCount(value) {
    const valueString = String(value);

    if (!valueString.includes(".")) {
        return 0;
    }

    return valueString.split(".")[1].length;
}

function triggerHaptic(type) {
    if (!telegram?.HapticFeedback) {
        return;
    }

    if (type === "success" || type === "error" || type === "warning") {
        telegram.HapticFeedback.notificationOccurred(type);
        return;
    }

    telegram.HapticFeedback.impactOccurred("light");
}

let toastTimer;

function showToast(message, type = "") {
    clearTimeout(toastTimer);

    elements.toast.textContent = message;
    elements.toast.className = "toast";

    if (type) {
        elements.toast.classList.add(type);
    }

    elements.toast.classList.add("show");

    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2200);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


    selectedOperation: "order",
    cart: []
};

const elements = {
    userName: document.getElementById("userName"),
    shopSelect: document.getElementById("shopSelect"),
    productSearch: document.getElementById("productSearch"),
    categories: document.getElementById("categories"),
    productsList: document.getElementById("productsList"),
    productsCount: document.getElementById("productsCount"),
    cartList: document.getElementById("cartList"),
    emptyCart: document.getElementById("emptyCart"),
    cartBadge: document.getElementById("cartBadge"),
    totalPositions: document.getElementById("totalPositions"),
    totalQuantity: document.getElementById("totalQuantity"),
    clearCartButton: document.getElementById("clearCartButton"),
    sendOrderButton: document.getElementById("sendOrderButton"),
    orderComment: document.getElementById("orderComment"),
    toast: document.getElementById("toast")
};

initializeApp();

function initializeApp() {
    loadCart();
    initializeTelegram();
    renderUser();
    renderShops();
    renderCategories();
    renderProducts();
    renderCart();
    bindEvents();
}

function initializeTelegram() {
    if (!telegram) {
        console.log("Приложение открыто вне Telegram");
        return;
    }

    telegram.ready();
    telegram.expand();

    if (typeof telegram.disableVerticalSwipes === "function") {
        telegram.disableVerticalSwipes();
    }

    configureTelegramMainButton();
}

function configureTelegramMainButton() {
    if (!telegram?.MainButton) {
        return;
    }

    telegram.MainButton.setText("ОТПРАВИТЬ ЗАКАЗ");
    telegram.MainButton.setParams({
        color: "#2d8cff",
        text_color: "#ffffff",
        is_active: true,
        is_visible: true
    });

    telegram.MainButton.onClick(sendOrder);
}

function renderUser() {
    const telegramUser = telegram?.initDataUnsafe?.user;

    if (!telegramUser) {
        elements.userName.textContent = "Тестовый пользователь";
        return;
    }

    const fullName = [
        telegramUser.first_name,
        telegramUser.last_name
    ]
        .filter(Boolean)
        .join(" ");

    elements.userName.textContent =
        fullName || telegramUser.username || `ID: ${telegramUser.id}`;
}

function renderShops() {
    const sortedShops = [...shops].sort((a, b) =>
        a.name.localeCompare(b.name, "ru")
    );

    sortedShops.forEach((shop) => {
        const option = document.createElement("option");

        option.value = shop.id;
        option.textContent = shop.name;

        elements.shopSelect.appendChild(option);
    });
}

function renderCategories() {
    const productCategories = products.map((product) => product.category);
    const uniqueCategories = ["Все", ...new Set(productCategories)];

    elements.categories.innerHTML = "";

    uniqueCategories.forEach((category) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "category-button";
        button.textContent = category;
        button.dataset.category = category;

        if (category === state.selectedCategory) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            state.selectedCategory = category;

            renderCategories();
            renderProducts();
        });

        elements.categories.appendChild(button);
    });
}

function getFilteredProducts() {
    const searchText = normalizeText(elements.productSearch.value);

    return products.filter((product) => {
        const matchesCategory =
            state.selectedCategory === "Все" ||
            product.category === state.selectedCategory;

        const productSearchValue = normalizeText(
            `${product.name} ${product.article} ${product.category}`
        );

        const matchesSearch =
            searchText.length === 0 ||
            productSearchValue.includes(searchText);

        return matchesCategory && matchesSearch;
    });
}

function renderProducts() {
    const filteredProducts = getFilteredProducts();

    elements.productsList.innerHTML = "";
    elements.productsCount.textContent =
        `${filteredProducts.length} позиций`;

    if (filteredProducts.length === 0) {
        elements.productsList.innerHTML = `
            <div class="no-products">
                Товары не найдены
            </div>
        `;

        return;
    }

    filteredProducts.forEach((product) => {
        const productElement = createProductElement(product);
        elements.productsList.appendChild(productElement);
    });
}

function createProductElement(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const itemInCart = state.cart.find(
        (item) => item.productId === product.id
    );

    const cartInfo = itemInCart
        ? `<div class="product-in-cart">
               В корзине: ${formatQuantity(itemInCart.quantity)} ${escapeHtml(product.unit)}
           </div>`
        : "";

    card.innerHTML = `
        <div class="product-top">
            <div class="product-info">
                <h3 class="product-name">
                    ${escapeHtml(product.name)}
                </h3>

                <div class="product-meta">
                    <span class="product-code">
                        Артикул: ${escapeHtml(product.article)}
                    </span>

                    <span class="product-unit">
                        Ед.: ${escapeHtml(product.unit)}
                    </span>
                </div>

                ${cartInfo}
            </div>
        </div>

        <div class="product-controls">
            <div class="quantity-control">
                <button
                    type="button"
                    class="quantity-button minus-button"
                    aria-label="Уменьшить количество"
                >
                    −
                </button>

                <input
                    type="number"
                    class="quantity-input"
                    value="${product.step}"
                    min="${product.step}"
                    step="${product.step}"
                    inputmode="decimal"
                >

                <button
                    type="button"
                    class="quantity-button plus-button"
                    aria-label="Увеличить количество"
                >
                    +
                </button>
            </div>

            <button type="button" class="add-button">
                Добавить
            </button>
        </div>
    `;

    const quantityInput = card.querySelector(".quantity-input");
    const minusButton = card.querySelector(".minus-button");
    const plusButton = card.querySelector(".plus-button");
    const addButton = card.querySelector(".add-button");

    minusButton.addEventListener("click", () => {
        const currentValue = parseQuantity(quantityInput.value);
        const newValue = Math.max(product.step, currentValue - product.step);

        quantityInput.value = formatInputQuantity(newValue, product.step);
    });

    plusButton.addEventListener("click", () => {
        const currentValue = parseQuantity(quantityInput.value);
        const newValue = currentValue + product.step;

        quantityInput.value = formatInputQuantity(newValue, product.step);
    });

    quantityInput.addEventListener("change", () => {
        let quantity = parseQuantity(quantityInput.value);

        if (quantity < product.step) {
            quantity = product.step;
        }

        quantityInput.value = formatInputQuantity(
            quantity,
            product.step
        );
    });

    addButton.addEventListener("click", () => {
        const quantity = parseQuantity(quantityInput.value);

        addToCart(product, quantity);
    });

    return card;
}

function addToCart(product, quantity) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
        showToast("Введите правильное количество", "error");
        return;
    }

    const existingItem = state.cart.find(
        (item) => item.productId === product.id
    );

    if (existingItem) {
        existingItem.quantity = roundQuantity(
            existingItem.quantity + quantity
        );
    } else {
        state.cart.push({
            productId: product.id,
            article: product.article,
            name: product.name,
            unit: product.unit,
            quantity: roundQuantity(quantity)
        });
    }

    saveCart();
    renderCart();
    renderProducts();

    triggerHaptic("success");
    showToast(`${product.name} добавлен`, "success");
}

function renderCart() {
    elements.cartList.innerHTML = "";

    const cartIsEmpty = state.cart.length === 0;

    elements.emptyCart.style.display =
        cartIsEmpty ? "block" : "none";

    elements.clearCartButton.style.display =
        cartIsEmpty ? "none" : "inline-block";

    state.cart.forEach((item) => {
        const cartItem = document.createElement("div");
        cartItem.className = "cart-item";

        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${escapeHtml(item.name)}
                </div>

                <div class="cart-item-quantity">
                    ${formatQuantity(item.quantity)}
                    ${escapeHtml(item.unit)}
                </div>
            </div>

            <button
                type="button"
                class="remove-cart-button"
                aria-label="Удалить товар"
            >
                ✕
            </button>
        `;

        const removeButton = cartItem.querySelector(
            ".remove-cart-button"
        );

        removeButton.addEventListener("click", () => {
            removeFromCart(item.productId);
        });

        elements.cartList.appendChild(cartItem);
    });

    updateSummary();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(
        (item) => item.productId !== productId
    );

    saveCart();
    renderCart();
    renderProducts();

    triggerHaptic("warning");
}

function clearCart() {
    if (state.cart.length === 0) {
        return;
    }

    const confirmed = confirm("Очистить всю корзину?");

    if (!confirmed) {
        return;
    }

    state.cart = [];

    saveCart();
    renderCart();
    renderProducts();

    showToast("Корзина очищена");
}

function updateSummary() {
    const totalPositions = state.cart.length;

    const totalQuantity = state.cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    elements.cartBadge.textContent = totalPositions;
    elements.totalPositions.textContent = totalPositions;
    elements.totalQuantity.textContent =
        formatQuantity(totalQuantity);

    elements.sendOrderButton.disabled = totalPositions === 0;

    if (telegram?.MainButton) {
        if (totalPositions === 0) {
            telegram.MainButton.disable();
        } else {
            telegram.MainButton.enable();
        }

        telegram.MainButton.setText(
            totalPositions === 0
                ? "КОРЗИНА ПУСТА"
                : `ОТПРАВИТЬ ЗАКАЗ · ${totalPositions}`
        );
    }
}

function bindEvents() {
    elements.productSearch.addEventListener("input", renderProducts);

    elements.clearCartButton.addEventListener("click", clearCart);

    elements.sendOrderButton.addEventListener("click", sendOrder);

    document
        .querySelectorAll(".operation-button")
        .forEach((button) => {
            button.addEventListener("click", () => {
                document
                    .querySelectorAll(".operation-button")
                    .forEach((item) => item.classList.remove("active"));

                button.classList.add("active");

                state.selectedOperation =
                    button.dataset.operation;
            });
        });
}

function sendOrder() {
    const selectedShopId = Number(elements.shopSelect.value);

    const selectedShop = shops.find(
        (shop) => shop.id === selectedShopId
    );

    if (!selectedShop) {
        showToast("Выберите торговую точку", "error");
        elements.shopSelect.focus();
        triggerHaptic("error");
        return;
    }

    if (state.cart.length === 0) {
        showToast("Добавьте товары в корзину", "error");
        triggerHaptic("error");
        return;
    }

    const telegramUser = telegram?.initDataUnsafe?.user;

    const order = {
        orderId: createOrderId(),

        operationType: state.selectedOperation,

        shop: {
            id: selectedShop.id,
            name: selectedShop.name
        },

        salesRepresentative: {
            telegramId: telegramUser?.id ?? null,
            username: telegramUser?.username ?? null,
            firstName: telegramUser?.first_name ?? "Не указан",
            lastName: telegramUser?.last_name ?? ""
        },

        items: state.cart.map((item) => ({
            productId: item.productId,
            article: item.article,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity
        })),

        comment: elements.orderComment.value.trim(),

        createdAt: new Date().toISOString()
    };

    const json = JSON.stringify(order);

    console.log("Заказ:", order);
    console.log("JSON:", json);

    /*
     * При обычном открытии через браузер
     * telegram.platform обычно равен "unknown".
     */
    const openedOutsideTelegram =
        !telegram || telegram.platform === "unknown";

    if (openedOutsideTelegram) {
        showOrderForBrowserTesting(json);
        return;
    }

    try {
        telegram.sendData(json);

        state.cart = [];
        saveCart();
        renderCart();
        renderProducts();

        elements.orderComment.value = "";

        triggerHaptic("success");
    } catch (error) {
        console.error("Ошибка отправки заказа:", error);

        showToast(
            "Не удалось отправить заказ",
            "error"
        );

        triggerHaptic("error");
    }
}

function showOrderForBrowserTesting(json) {
    const formattedJson = JSON.stringify(
        JSON.parse(json),
        null,
        2
    );

    console.log(formattedJson);

    alert(
        "Mini App открыт вне Telegram.\n\n" +
        "Заказ сформирован правильно.\n" +
        "Откройте консоль браузера, чтобы увидеть JSON."
    );

    showToast("Тестовый заказ сформирован", "success");
}

function saveCart() {
    try {
        localStorage.setItem(
            "viar-mini-app-cart",
            JSON.stringify(state.cart)
        );
    } catch (error) {
        console.warn("Не удалось сохранить корзину:", error);
    }
}

function loadCart() {
    try {
        const savedCart = localStorage.getItem(
            "viar-mini-app-cart"
        );

        if (!savedCart) {
            return;
        }

        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
            state.cart = parsedCart;
        }
    } catch (error) {
        console.warn("Не удалось загрузить корзину:", error);
        state.cart = [];
    }
}

function createOrderId() {
    const datePart = new Date()
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14);

    const randomPart = Math.floor(
        1000 + Math.random() * 9000
    );

    return `ORDER-${datePart}-${randomPart}`;
}

function normalizeText(value) {
    return String(value)
        .toLowerCase()
        .trim()
        .replaceAll("ё", "е")
        .replaceAll("і", "и")
        .replaceAll("ї", "и");
}

function parseQuantity(value) {
    const normalizedValue = String(value)
        .replace(",", ".")
        .trim();

    const result = Number.parseFloat(normalizedValue);

    return Number.isFinite(result) ? result : 0;
}

function roundQuantity(value) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatQuantity(value) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 3
    }).format(value);
}

function formatInputQuantity(value, step) {
    const decimals = getDecimalsCount(step);

    return roundQuantity(value).toFixed(decimals);
}

function getDecimalsCount(value) {
    const valueString = String(value);

    if (!valueString.includes(".")) {
        return 0;
    }

    return valueString.split(".")[1].length;
}

function triggerHaptic(type) {
    if (!telegram?.HapticFeedback) {
        return;
    }

    if (type === "success" || type === "error" || type === "warning") {
        telegram.HapticFeedback.notificationOccurred(type);
        return;
    }

    telegram.HapticFeedback.impactOccurred("light");
}

let toastTimer;

function showToast(message, type = "") {
    clearTimeout(toastTimer);

    elements.toast.textContent = message;
    elements.toast.className = "toast";

    if (type) {
        elements.toast.classList.add(type);
    }

    elements.toast.classList.add("show");

    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2200);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

