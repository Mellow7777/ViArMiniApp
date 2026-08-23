"use strict";

const telegram = window.Telegram?.WebApp;

let products = [];
let shops = [];

const API_BASE_URL =
    "https://dev-api.via-r-order.com";

const ADMIN_TELEGRAM_IDS = [
    564525966
];

const productGroups = [
    "Все",
    "Тарасівські ковбаси",
    "КБК",
    "Крупельницькі ковбаси",
    "Молочна продукція",
    "Чипси курячі",
    "Снеки",
    "Домашня продукція"
];

const state = {
    activeMode: "order",
    selectedGroup: "Все",
    invoiceForm: "2",
    productSearchQuery: "",
    drawerMode: "order",
    orderCart: [],
    returnCart: []
};

const elements = {
    cartTitle: document.getElementById("cartTitle"),
    totalPrice: document.getElementById("totalPrice"),
    userName: document.getElementById("userName"),
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
    toast: document.getElementById("toast"),
    orderComment: document.getElementById("orderComment"),
    
toast: document.getElementById("toast"),

productModal:
    document.getElementById("productModal"),

productModalOverlay:
    document.getElementById("productModalOverlay"),

productModalClose:
    document.getElementById("productModalClose"),

productModalImage:
    document.getElementById("productModalImage"),

productImageLoading:
    document.getElementById("productImageLoading"),

productModalName:
    document.getElementById("productModalName"),

productModalArticle:
    document.getElementById("productModalArticle"),

productModalPrice:
    document.getElementById("productModalPrice"),

productModalWeight:
    document.getElementById("productModalWeight"),

productModalAvailability:
    document.getElementById("productModalAvailability"),

floatingCartButton:
    document.getElementById("floatingCartButton"),

floatingCartCount:
    document.getElementById("floatingCartCount"),

cartSection:
    document.getElementById("cartSection"),
    cartDrawer:
    document.getElementById("cartDrawer"),

cartDrawerOverlay:
    document.getElementById("cartDrawerOverlay"),

cartDrawerClose:
    document.getElementById("cartDrawerClose"),

drawerCartList:
    document.getElementById("drawerCartList"),

drawerEmptyCart:
    document.getElementById("drawerEmptyCart"),

drawerOrderCount:
    document.getElementById("drawerOrderCount"),

drawerReturnCount:
    document.getElementById("drawerReturnCount"),

drawerCartSummary:
    document.getElementById("drawerCartSummary"),

drawerPositions:
    document.getElementById("drawerPositions"),

drawerQuantity:
    document.getElementById("drawerQuantity"),

drawerTotalPrice:
    document.getElementById("drawerTotalPrice"),

drawerSendButton:
    document.getElementById("drawerSendButton"),
    shopSearch:
    document.getElementById("shopSearch"),

shopSearchResults:
    document.getElementById("shopSearchResults"),

selectedShopId:
    document.getElementById("selectedShopId"),

selectedShopCard:
    document.getElementById("selectedShopCard"),

selectedShopName:
    document.getElementById("selectedShopName"),

selectedShopAddress:
    document.getElementById("selectedShopAddress"),

clearSelectedShopButton:
    document.getElementById(
        "clearSelectedShopButton"
    ),

drawerTotalTitle:
    document.getElementById("drawerTotalTitle"),   
    
drawerTotalPrice:
    document.getElementById("drawerTotalPrice"),

largeTextToggle:
    document.getElementById("largeTextToggle"),

historyButton:
    document.getElementById(
        "historyButton"
    ),

historyContainer:
    document.getElementById(
        "historyContainer"
    ),    
    
};
    

function getActiveCart() {
    return state.activeMode === "return"
        ? state.returnCart
        : state.orderCart;
}

function getActiveModeTitle() {
    return state.activeMode === "return"
        ? "возврат"
        : "заказ";
}

function getAllItemsCount() {
    return (
        state.orderCart.length +
        state.returnCart.length
    );
}

async function loadCurrentStocks() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/stocks?v=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Ошибка загрузки остатков: ${response.status}`
            );
        }

        const stocks = await response.json();

        console.log(
            "Остатки с API:",
            stocks
        );

        products.forEach(product => {
            const article =
                String(product.article).trim();

            const stockInfo =
                stocks[article];

            if (!stockInfo) {
                return;
            }

            product.stock =
                Number(stockInfo.stock);

            product.stockUnit =
                stockInfo.unit ||
                product.unit1C ||
                "кг";
        });

        console.log(
            "Остатки применены"
        );
    } catch (error) {
        console.error(
            "Ошибка loadCurrentStocks:",
            error
        );
    }
}

initializeApp();

async function initializeApp() {
    loadCart();
    initializeTelegram();
    loadMyProfile();
    renderUser();
    initializeAdminAccess();
    bindEvents();
    

    await Promise.all([
        loadProducts(),
        loadShops()
    ]);

    restoreSelectedShop();

    renderGroups();
    renderProducts();

    // Остатки загружаются в фоне.
    // Когда придут — перерисуем товары.
    loadCurrentStocks()
        .then(() => {
            renderProducts();
        })
        .catch(error => {
            console.error(
                "Ошибка загрузки остатков:",
                error
            );
        });

    const largeTextEnabled =
        localStorage.getItem(
            "viar-large-text"
        ) === "1";

    if (largeTextEnabled) {
        document.body.classList.add(
            "large-text-mode"
        );

        if (elements.largeTextToggle) {
            elements.largeTextToggle.textContent =
                "🔎 Обычный текст";
        }
    }

    renderCart();
}

function openCartDrawer() {
    if (!elements.cartDrawer) {
        return;
    }

    renderDrawerCart();

    elements.cartDrawer.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
    if (!elements.cartDrawer) {
        return;
    }

    elements.cartDrawer.classList.remove("show");
    document.body.style.overflow = "";
}

function getDrawerCart() {
    return state.drawerMode === "return"
        ? state.returnCart
        : state.orderCart;
}

function renderGroups() {
    if (!elements.categories) {
        return;
    }

    elements.categories.innerHTML = "";

    productGroups.forEach((group) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "category-button";
        button.textContent = group;

        if (state.selectedGroup === group) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            state.selectedGroup = group;

            // Полностью сбрасываем сохранённый поиск
            state.productSearchQuery = "";

            // Поле поиска тоже очищаем
            if (elements.productSearch) {
                elements.productSearch.value = "";
                elements.productSearch.blur();
            }

            renderGroups();
            renderProducts();
        });

        elements.categories.appendChild(button);
    });
}

async function loadProducts() {
    try {
        elements.productsList.innerHTML = `
            <div class="no-products">
                Загрузка товаров...
            </div>
        `;

        const response = await fetch(
            `./products.json?v=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Ошибка загрузки: ${response.status}`
            );
        }

        const loadedProducts =
            await response.json();

        if (!Array.isArray(loadedProducts)) {
            throw new Error(
                "products.json должен содержать массив"
            );
        }

        products = loadedProducts.map(product => ({
            ...product,

            name:
                product.nameUa ||
                product.name ||
                product.nameRu ||
                "Без названия",

            orderName:
                product.orderName ||
                product.nameUa ||
                product.name ||
                product.nameRu ||
                "Без названия",

            saleMode:
                (product.saleMode || "кг")
                    .toLowerCase()
                    .trim(),

            stock:
                Number(product.stock || 0),

            price:
                Number(product.price || 0),

            approximateWeightPerPiece:
                Number(
                    product.approximateWeightPerPiece || 0
                ),

            searchAliases:
                product.searchAliases || ""
        }));

        console.log(
            `Загружено товаров: ${products.length}`
        );

        console.log(
            "Первый товар:",
            products[0]
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
    }
}

function initializeTelegram() {
    if (!telegram) {
        console.log("Приложение открыто вне Telegram");
        return;
    }

    telegram.ready();
    telegram.expand();

    const telegramVersion =
        Number.parseFloat(telegram.version || "0");

    if (
        telegramVersion >= 7.7 &&
        typeof telegram.disableVerticalSwipes === "function"
    ) {
        telegram.disableVerticalSwipes();
    }

    if (telegram.MainButton) {
        telegram.MainButton.hide();
        telegram.MainButton.offClick(sendOrder);
    }
}

function configureTelegramMainButton() {
    if (!telegram?.MainButton) {
        return;
    }

    telegram.MainButton.hide();
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

function initializeAdminAccess() {
    const tg = window.Telegram?.WebApp;

    const adminButton =
        document.getElementById("adminButton");

    if (!adminButton) {
        return;
    }

    const telegramUser =
        tg?.initDataUnsafe?.user;

    if (!telegramUser) {
        adminButton.hidden = true;
        return;
    }

    const telegramId =
        Number(telegramUser.id);

    const isAdmin =
        ADMIN_TELEGRAM_IDS.includes(
            telegramId
        );

    adminButton.hidden =
        !isAdmin;
}

async function loadShops() {
    try {
        const response = await fetch(
            `./shops.json?v=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Ошибка загрузки shops.json: ${response.status}`
            );
        }

        const loadedShops =
            await response.json();

        if (!Array.isArray(loadedShops)) {
            throw new Error(
                "shops.json должен содержать массив"
            );
        }

        shops = loadedShops;

        console.log(
            `Загружено точек: ${shops.length}`
        );
    } catch (error) {
        console.error(
            "Ошибка загрузки торговых точек:",
            error
        );

        shops = [];

        showToast(
            "Не удалось загрузить торговые точки",
            "error"
        );
    }
}

function normalizeShopSearch(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replaceAll("ё", "е");
}

function getShopSearchText(shop) {
    return normalizeShopSearch([
        shop.id,
        shop.name,
        shop.nameUa,
        shop.nameRu,
        shop.address,
        shop.district,
        shop.searchAliases
    ]
        .filter(Boolean)
        .join(" "));
}

function getShopDisplayName(shop) {
    return (
        shop.nameUa ||
        shop.nameRu ||
        shop.name ||
        "Без названия"
    );
}

function getFilteredShops() {
    const query = normalizeShopSearch(
        elements.shopSearch?.value || ""
    );

    if (!query) {
        return [];
    }

    return shops
        .filter((shop) => {
            const searchableText =
                getShopSearchText(shop);

            return searchableText.includes(query);
        })
        .slice(0, 20);
}

function renderShopSearchResults() {
    if (!elements.shopSearchResults) {
        return;
    }

    const searchText =
        elements.shopSearch.value.trim();

    elements.shopSearchResults.innerHTML = "";

    if (searchText.length === 0) {
        elements.shopSearchResults.classList.remove(
            "show"
        );

        return;
    }

    const filteredShops =
        getFilteredShops();

    if (filteredShops.length === 0) {
        elements.shopSearchResults.innerHTML = `
            <div class="shop-no-results">
                Торговые точки не найдены
            </div>
        `;

        elements.shopSearchResults.classList.add(
            "show"
        );

        return;
    }

    filteredShops.forEach((shop) => {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "shop-result-item";

        button.innerHTML = `
            <strong>
                ${escapeHtml(getShopDisplayName(shop))}
            </strong>

            <span>
                ${escapeHtml(shop.address || "")}
            </span>
        `;

        button.addEventListener("click", () => {
            selectShop(shop);
        });

        elements.shopSearchResults.appendChild(
            button
        );
    });

    elements.shopSearchResults.classList.add(
        "show"
    );
}

function selectShop(shop) {
    elements.selectedShopId.value =
        String(shop.id);

    elements.selectedShopName.textContent =
    getShopDisplayName(shop);

    elements.selectedShopAddress.textContent =
        shop.address || "Адрес не указан";

    elements.selectedShopCard.hidden = false;

    elements.historyButton.hidden = false;

elements.historyContainer.hidden = true;
elements.historyContainer.innerHTML = "";

    elements.shopSearch.value = "";
    elements.shopSearch.style.display = "none";

    elements.shopSearchResults.innerHTML = "";
    elements.shopSearchResults.classList.remove(
        "show"
    );

    localStorage.setItem(
        "viar-selected-shop-id",
        String(shop.id)
    );

    triggerHaptic("success");
}

function clearSelectedShop() {
    elements.selectedShopId.value = "";

    elements.selectedShopCard.hidden = true;
    elements.historyButton.hidden = true;

    elements.historyContainer.hidden = true;
    elements.historyContainer.innerHTML = "";
    elements.shopSearch.style.display = "";

    elements.shopSearch.value = "";
    elements.shopSearch.focus();

    localStorage.removeItem(
        "viar-selected-shop-id"
    );
}

function restoreSelectedShop() {
    const savedShopId = Number(
        localStorage.getItem(
            "viar-selected-shop-id"
        )
    );

    if (!savedShopId) {
        return;
    }

    const savedShop = shops.find(
        (shop) => shop.id === savedShopId
    );

    if (savedShop) {
        selectShop(savedShop);
    }
}

function renderCategories() {
const productCategories = products
    .map((product) =>
        String(product.category || "").trim()
    )
    .filter(Boolean);

const uniqueCategories = [
    "Все",
    ...new Set(productCategories)
];

    elements.categories.innerHTML = "";

    /*
     * Если выбранной категории больше нет,
     * автоматически возвращаемся на "Все".
     */
    if (
        !uniqueCategories.includes(
            state.selectedCategory
        )
    ) {
        state.selectedCategory = "Все";
    }

    uniqueCategories.forEach((category) => {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "category-button";
        button.textContent = category;
        button.dataset.category = category;

        if (
            category ===
            state.selectedCategory
        ) {
            button.classList.add("active");
        }

        button.addEventListener(
            "click",
            () => {
                state.selectedCategory =
                    category;

                state.productSearchQuery = "";

                if (elements.productSearch) {
                    elements.productSearch.value =
                        "";

                    elements.productSearch.blur();
                }

                renderCategories();
                renderProducts();
            }
        );

        elements.categories.appendChild(
            button
        );
    });
}

function hideProductKeyboardKeepResults() {
    if (!elements.productSearch) {
        return;
    }

    if (
        document.activeElement !==
        elements.productSearch
    ) {
        return;
    }

    elements.productSearch.blur();

    // Очищаем только видимое поле.
    // state.productSearchQuery не трогаем.
    elements.productSearch.value = "";
}

function getFilteredProducts() {
    const searchText = normalizeText(
        state.productSearchQuery || ""
    );

    return products.filter((product) => {
        const category = String(
            product.category || ""
        ).trim();

        const normalizedCategory = normalizeText(category);

const normalizedSelectedCategory = normalizeText(
    state.selectedCategory || "Все"
);

const matchesCategory =
    normalizedSelectedCategory === normalizeText("Все") ||
    normalizedCategory === normalizedSelectedCategory;

        const searchableText = normalizeText(
            [
                product.name,
                product.nameUa,
                product.nameRu,
                product.orderName,
                product.searchAliases,
                product.article,
                product.category
            ]
                .filter(Boolean)
                .join(" ")
        );

        const matchesSearch =
            searchText.length === 0 ||
            searchableText.includes(searchText);

        return matchesCategory && matchesSearch;
    });
}

 function renderProducts(){
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
    card.id = `product-${product.id}`;

    const isAvailable =
        product.isAvailable === true;

    const canAddProduct =
    state.activeMode === "return" ||
    isAvailable;

    const saleMode =
    (product.saleMode || "кг")
        .toLowerCase()
        .trim();

let selectedUnit =
    saleMode === "шт"
        ? "шт"
        : "кг";

const canUseKg =
    saleMode === "кг" ||
    saleMode === "кг/шт";

const canUsePiece =
    saleMode === "шт" ||
    saleMode === "кг/шт";

const showUnitSwitch =
    saleMode === "кг/шт";

let unitSwitchHtml = "";

if (showUnitSwitch) {
    unitSwitchHtml = `
        <div class="product-unit-section">
            <div class="unit-section-title">
                Оберіть одиницю
            </div>

            <div class="unit-switch">
                <button
                    type="button"
                    class="unit-switch-button ${
                        selectedUnit === "кг"
                            ? "active"
                            : ""
                    }"
                    data-unit="кг"
                >
                    <span class="unit-icon">⚖️</span>
                    <span class="unit-name">КГ</span>
                    <span class="unit-check">✓</span>
                </button>

                <button
                    type="button"
                    class="unit-switch-button ${
                        selectedUnit === "шт"
                            ? "active"
                            : ""
                    }"
                    data-unit="шт"
                >
                    <span class="unit-icon">📦</span>
                    <span class="unit-name">ШТ</span>
                    <span class="unit-check">✓</span>
                </button>
            </div>
        </div>
    `;
}

card.innerHTML = `
    <div class="viar-watermark" aria-hidden="true">
        <div class="viar-watermark-logo">
            ВІАР
        </div>

        <div class="viar-watermark-slogan">
            ЯКІСТЬ • СМАК • ДОВІРА
        </div>
    </div>

    <div class="product-card-header">
        <h3 class="product-name">
            ${escapeHtml(product.name)}
        </h3>

        <button
            type="button"
            class="info-button"
            aria-label="Інформація про товар"
        >
            i
        </button>
    </div>

   <div class="product-price-label">
    ${
        selectedUnit === "шт"
            ? "Ціна за шт"
            : "Ціна за кг"
    }
</div>

<div class="product-price-value">
    ${formatMoney(product.price)}
    <span>
        ${
            selectedUnit === "шт"
                ? "грн/шт"
                : "грн/кг"
        }
    </span>
</div>

    <div class="availability ${
    isAvailable
        ? "available"
        : "unavailable"
}">
    ${
        isAvailable
            ? `● В наявності · Залишок: ${formatStock(product.stock)} кг`
            : "● Немає в наявності"
    }
</div>
    <div class="product-divider"></div>

    ${unitSwitchHtml}

    <div class="product-bottom">
        <div class="product-controls">
            <div class="quantity-control">
                <button
                    type="button"
                    class="quantity-button minus-button"
                    ${canAddProduct ? "" : "disabled"}
                    aria-label="Зменшити кількість"
                >
                    −
                </button>

                <input
                    type="number"
                    class="quantity-input"
                value="${
    selectedUnit === "шт"
        ? "1"
        : state.activeMode === "return"
            ? "0.001"
            : "0.1"
}"
min="${
    selectedUnit === "шт"
        ? "1"
        : state.activeMode === "return"
            ? "0.001"
            : "0.1"
}"
step="${
    selectedUnit === "шт"
        ? "1"
        : state.activeMode === "return"
            ? "0.001"
            : "0.1"
}"
                    inputmode="decimal"
                    ${canAddProduct ? "" : "disabled"}
                >

                <button
                    type="button"
                    class="quantity-button plus-button"
                    ${canAddProduct ? "" : "disabled"}
                    aria-label="Збільшити кількість"
                >
                    +
                </button>
            </div>

            <div class="product-estimated-total">
                <span class="estimated-symbol">≈</span>
                <span class="estimated-value">0</span>
                <span class="estimated-currency">грн</span>
            </div>
        </div>

        <button
            type="button"
            class="add-button"
            ${canAddProduct ? "" : "disabled"}
        >
             <span class="add-button-icon">🛒</span>

            <span class="add-button-text">
                ${
                    canAddProduct
                        ? state.activeMode === "return"
                            ? "Додати в повернення"
                            : "Додати в замовлення"
                        : "Немає в наявності"
                }
            </span>
        </button>
    </div>
`;

    const infoButton =
    card.querySelector(".info-button");

if (infoButton) {
    infoButton.addEventListener("click", () => {
        openProductModal(product);
    });
}

  if (!canAddProduct) {
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

    const estimatedTotalElement =
        card.querySelector(
            ".product-estimated-total"
        );

    const unitButtons =
        card.querySelectorAll(
            ".unit-switch-button"
        );

    const priceLabelElement =
    card.querySelector(
        ".product-price-label"
    );

const priceValueElement =
    card.querySelector(
        ".product-price-value"
    );

function updatePriceDisplay() {
    const saleMode =
        (product.saleMode || "кг")
            .toLowerCase()
            .trim();

    if (!priceLabelElement ||
        !priceValueElement) {
        return;
    }

    if (saleMode === "шт") {
        priceLabelElement.textContent =
            "Ціна за шт";

        priceValueElement.innerHTML = `
            ${formatMoney(product.price)}
            <span>грн/шт</span>
        `;

        return;
    }

    if (selectedUnit === "шт") {
        const piecePrice =
            Number(product.price || 0) *
            Number(
                product.approximateWeightPerPiece || 0
            );

        priceLabelElement.textContent =
            "Ціна за шт приблизно";

        priceValueElement.innerHTML = `
            ≈ ${formatMoney(piecePrice)}
            <span>грн/шт</span>
        `;
    } else {
        priceLabelElement.textContent =
            "Ціна за кг";

        priceValueElement.innerHTML = `
            ${formatMoney(product.price)}
            <span>грн/кг</span>
        `;
    }
}    

    
    function getStep() {
    if (selectedUnit === "шт") {
        return 1;
    }

    return state.activeMode === "return"
        ? 0.001
        : 0.1;
}

    
    function updateQuantitySettings() {
    const step = getStep();

    quantityInput.step = String(step);
    quantityInput.min = String(step);

    if (selectedUnit === "шт") {
        quantityInput.value = "1";
        quantityInput.inputMode = "numeric";
    } else if (state.activeMode === "return") {
        quantityInput.value = "0.001";
        quantityInput.inputMode = "decimal";
    } else {
        quantityInput.value = "0.1";
        quantityInput.inputMode = "decimal";
    }

    updateEstimatedTotal();
}

    function calculateEstimatedTotal() {
    const quantity =
        parseQuantity(quantityInput.value);

    const price =
        Number(product.price || 0);

    const saleMode =
        (product.saleMode || "кг")
            .toLowerCase()
            .trim();

    // Товар продаётся ТОЛЬКО поштучно:
    // цена в Excel считается ценой за 1 шт.
    if (saleMode === "шт") {
        return roundMoney(
            quantity * price
        );
    }

    // Товар кг/шт, но сейчас выбраны штуки:
    // цена в Excel за кг,
    // поэтому переводим штуки в примерный вес.
    if (selectedUnit === "шт") {
        const weightPerPiece =
            Number(
                product.approximateWeightPerPiece || 0
            );

        const estimatedWeight =
            quantity * weightPerPiece;

        return roundMoney(
            estimatedWeight * price
        );
    }

    // Обычный товар в кг
    return roundMoney(
        quantity * price
    );
}



    function updateEstimatedTotal() {
    const total =
        calculateEstimatedTotal();

    const valueElement =
        estimatedTotalElement.querySelector(
            ".estimated-value"
        );

    if (valueElement) {
        valueElement.textContent =
            formatMoney(total);
    }
}

    unitButtons.forEach((button) => {
    button.addEventListener("click", () => {
        unitButtons.forEach((item) =>
            item.classList.remove("active")
        );

        button.classList.add("active");

        selectedUnit =
            button.dataset.unit;

        updateQuantitySettings();
        updatePriceDisplay();
    });
});

    minusButton.addEventListener("click", () => {
        const step = getStep();

        const currentValue =
            parseQuantity(quantityInput.value);

        const newValue =
            Math.max(step, currentValue - step);

        quantityInput.value =
            formatInputQuantity(
                newValue,
                step
            );

        updateEstimatedTotal();
    });

    plusButton.addEventListener("click", () => {
        const step = getStep();

        const currentValue =
            parseQuantity(quantityInput.value);

        const newValue =
            currentValue + step;

        quantityInput.value =
            formatInputQuantity(
                newValue,
                step
            );

        updateEstimatedTotal();
    });

    quantityInput.addEventListener(
        "input",
        updateEstimatedTotal
    );

    quantityInput.addEventListener("change", () => {
        const step = getStep();

        let quantity =
            parseQuantity(quantityInput.value);

        if (quantity < step) {
            quantity = step;
        }

        quantityInput.value =
            formatInputQuantity(
                quantity,
                step
            );

        updateEstimatedTotal();
    });

    addButton.addEventListener("click", () => {
        const quantity =
            parseQuantity(quantityInput.value);

        addToCart(
            product,
            quantity,
            selectedUnit
        );
    });

    updatePriceDisplay();
updateEstimatedTotal();

return card;
}


function addToCart(
    product,
    quantity,
    selectedUnit
) {
    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {
        showToast(
            "Введите правильное количество",
            "error"
        );

        return;
    }

    const activeCart = getActiveCart();

    const cartKey =
        `${product.id}-${selectedUnit}`;

    const existingItem = activeCart.find(
        (item) => item.cartKey === cartKey
    );

    if (existingItem) {
        existingItem.quantity =
            roundQuantity(
                existingItem.quantity +
                quantity
            );

        existingItem.price =
            Number(product.price || 0);

        existingItem.approximateWeightPerPiece =
            Number(
                product.approximateWeightPerPiece || 0
            );
    } else {
        activeCart.push({
            cartKey: cartKey,
            productId: product.id,
            article: product.article,
            name: product.name,
            unit: selectedUnit,
            quantity: roundQuantity(quantity),
            price: Number(product.price || 0),
            approximateWeightPerPiece:
                Number(
                    product.approximateWeightPerPiece || 0
                )
        });
    }

    saveCart();
    renderCart();
    renderProducts();
    updateSummary();
    renderDrawerCart();

    triggerHaptic("success");

    const operationText =
        state.activeMode === "return"
            ? "в возврат"
            : "в заказ";

    showToast(
        `${product.name} добавлено ${operationText}`,
        "success"
    );
}

function calculateItemEstimatedWeight(item) {
    if (item.unit === "шт") {
        return roundQuantity(
            item.quantity *
            Number(
                item.approximateWeightPerPiece || 0
            )
        );
    }

    return roundQuantity(item.quantity);
}

function calculateItemEstimatedTotal(item) {
    const estimatedWeight =
        calculateItemEstimatedWeight(item);

    return roundMoney(
        estimatedWeight *
        Number(item.price || 0)
    );
}

function calculateCartTotal() {
    return state.orderCart.reduce(
        (total, item) => {
            return (
                total +
                calculateItemEstimatedTotal(item)
            );
        },
        0
    );
}


function roundMoney(value) {
    return Math.round(
        (Number(value) +
            Number.EPSILON) * 100
    ) / 100;
}

function formatMoney(value) {
    return new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number(value || 0));
}

function renderCart() {
    const activeCart = getActiveCart();

    elements.cartList.innerHTML = "";

    elements.cartTitle.textContent =
        state.activeMode === "return"
            ? "Корзина возврата"
            : "Корзина заказа";

    const cartIsEmpty =
        activeCart.length === 0;

    elements.emptyCart.style.display =
        cartIsEmpty ? "block" : "none";

    elements.emptyCart.textContent =
        state.activeMode === "return"
            ? "Возврат пока пустой"
            : "Заказ пока пустой";

    elements.clearCartButton.style.display =
        cartIsEmpty
            ? "none"
            : "inline-block";

    activeCart.forEach((item) => {
        const cartItem =
            document.createElement("div");

        cartItem.className = "cart-item";

        const estimatedWeight =
            calculateItemEstimatedWeight(item);

        const estimatedTotal =
            calculateItemEstimatedTotal(item);

        const priceHtml =
            state.activeMode === "order"
                ? `
                    <div class="cart-item-price">
                        ≈ ${formatMoney(
                            estimatedTotal
                        )} грн
                    </div>
                `
                : "";

        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${escapeHtml(item.name)}
                </div>

                <div class="cart-item-quantity">
                    ${formatQuantity(item.quantity)}
                    ${escapeHtml(item.unit)}

                    ${
                        item.unit === "шт"
                            ? `
                                <br>
                                ≈ ${formatQuantity(
                                    estimatedWeight
                                )} кг
                            `
                            : ""
                    }
                </div>

                ${priceHtml}
            </div>

            <button
                type="button"
                class="remove-cart-button"
                aria-label="Удалить товар"
            >
                ✕
            </button>
        `;

        const removeButton =
            cartItem.querySelector(
                ".remove-cart-button"
            );

        removeButton.addEventListener(
            "click",
            () => {
                removeFromCart(
                    item.cartKey
                );
            }
        );

        elements.cartList.appendChild(
            cartItem
        );
    });

    updateSummary();
}

   function removeFromCart(cartKey) {
    if (state.activeMode === "return") {
        state.returnCart =
            state.returnCart.filter(
                (item) =>
                    item.cartKey !== cartKey
            );
    } else {
        state.orderCart =
            state.orderCart.filter(
                (item) =>
                    item.cartKey !== cartKey
            );
    }

    saveCart();
    renderCart();
    renderProducts();
    renderDrawerCart();

    triggerHaptic("warning");
}

function updateSummary() {
    const activeCart = getActiveCart();

    const activePositions = activeCart.length;

    const activeQuantity = activeCart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const totalItemsCount =
        state.orderCart.length +
        state.returnCart.length;

    const activeTotal = activeCart.reduce(
        (sum, item) => {
            return sum + calculateItemEstimatedTotal(item);
        },
        0
    );

    if (elements.cartBadge) {
        elements.cartBadge.textContent =
            totalItemsCount;
    }

    if (elements.floatingCartCount) {
        elements.floatingCartCount.textContent =
            totalItemsCount;
    }

    if (elements.totalPositions) {
        elements.totalPositions.textContent =
            activePositions;
    }

    if (elements.totalQuantity) {
        elements.totalQuantity.textContent =
            formatQuantity(activeQuantity);
    }

    if (elements.totalPrice) {
        const totalTitle =
            state.activeMode === "return"
                ? "Сумма возврата"
                : "Примерная сумма заказа";

        elements.totalPrice.innerHTML = `
            <span>${totalTitle}</span>
            <strong>
                ≈ ${formatMoney(activeTotal)} грн
            </strong>
        `;
    }

    const nothingToSend =
        state.orderCart.length === 0 &&
        state.returnCart.length === 0;

    if (elements.sendOrderButton) {
        elements.sendOrderButton.disabled =
            nothingToSend;
    }

    if (elements.floatingCartButton) {
        elements.floatingCartButton.classList.toggle(
            "has-items",
            totalItemsCount > 0
        );
    }

    if (telegram?.MainButton) {
        telegram.MainButton.hide();
    }
}

function clearCart() {
    const activeCart = getActiveCart();

    if (activeCart.length === 0) {
        return;
    }

    const operationTitle =
        state.activeMode === "return"
            ? "возврат"
            : "заказ";

    const confirmed = confirm(
        `Очистить весь ${operationTitle}?`
    );

    if (!confirmed) {
        return;
    }

    if (state.activeMode === "return") {
        state.returnCart = [];
    } else {
        state.orderCart = [];
    }

    saveCart();
    renderCart();
    renderProducts();
    renderDrawerCart();

    showToast(
        state.activeMode === "return"
            ? "Возврат очищен"
            : "Заказ очищен"
    );
}

function renderDrawerCart() {
    if (!elements.drawerCartList) {
        return;
    }

    const activeCart = getDrawerCart();

    elements.drawerCartList.innerHTML = "";

    const isEmpty = activeCart.length === 0;

    if (elements.drawerEmptyCart) {
        elements.drawerEmptyCart.style.display =
            isEmpty ? "block" : "none";

        elements.drawerEmptyCart.textContent =
            state.drawerMode === "return"
                ? "Корзина возврата пока пустая"
                : "Корзина заказа пока пустая";
    }

    const refreshCart = () => {
        saveCart();
        renderDrawerCart();

        if (typeof renderCart === "function") {
            renderCart();
        }

        if (typeof renderProducts === "function") {
            renderProducts();
        }

        if (typeof updateSummary === "function") {
            updateSummary();
        }
    };

    const productsList =
        Array.isArray(state.products)
            ? state.products
            : (
                typeof products !== "undefined" &&
                Array.isArray(products)
                    ? products
                    : []
            );

    activeCart.forEach((item) => {
        const product = productsList.find(
            (productItem) =>
                Number(productItem.id) ===
                    Number(item.productId) ||
                (
                    item.article &&
                    String(productItem.article) ===
                        String(item.article)
                )
        );

        const saleMode = String(
            product?.saleMode ??
            product?.SaleMode ??
            item.saleMode ??
            "кг"
        )
            .toLowerCase()
            .trim();

        const approximateWeightPerPiece = Number(
            product?.approximateWeightPerPiece ??
            product?.ApproximateWeightPerPiece ??
            item.approximateWeightPerPiece ??
            0
        );

        const canUseKg =
            saleMode === "кг" ||
            saleMode === "кг/шт";

        const canUsePiece =
            saleMode === "шт" ||
            saleMode === "кг/шт";

        const canSwitchUnit =
            saleMode === "кг/шт" &&
            Number.isFinite(
                approximateWeightPerPiece
            ) &&
            approximateWeightPerPiece > 0;

        if (!item.unit) {
            item.unit =
                saleMode === "шт"
                    ? "шт"
                    : "кг";
        }

        if (
            item.unit === "шт" &&
            !canUsePiece
        ) {
            item.unit = "кг";
        }

        if (
            item.unit === "кг" &&
            !canUseKg
        ) {
            item.unit = "шт";
        }

        const row =
            document.createElement("div");

        row.className = "drawer-cart-item";

        const getStep = () => {
            if (item.unit === "шт") {
                return 1;
            }

            return state.drawerMode === "return"
                ? 0.001
                : 0.1;
        };

        const estimatedTotal =
            calculateItemEstimatedTotal(item);

        const unitHtml = canSwitchUnit
            ? `
                <select
                    class="drawer-unit-select"
                    aria-label="Единица измерения"
                >
                    <option
                        value="кг"
                        ${
                            item.unit === "кг"
                                ? "selected"
                                : ""
                        }
                    >
                        КГ
                    </option>

                    <option
                        value="шт"
                        ${
                            item.unit === "шт"
                                ? "selected"
                                : ""
                        }
                    >
                        ШТ
                    </option>
                </select>
            `
            : `
                <div class="drawer-item-unit">
                    ${escapeHtml(
                        String(
                            item.unit || ""
                        ).toUpperCase()
                    )}
                </div>
            `;

        const weightHintHtml =
            item.unit === "шт" &&
            approximateWeightPerPiece > 0
                ? `
                    <div class="drawer-item-weight-hint">
                        ≈ ${formatQuantity(
                            Number(
                                item.quantity || 0
                            ) *
                            approximateWeightPerPiece
                        )} кг
                    </div>
                `
                : "";

        row.innerHTML = `
            <div class="drawer-item-top">
                <div>
                    <div class="drawer-item-name">
                        ${escapeHtml(
                            item.name ||
                            product?.name ||
                            product?.Name ||
                            "Товар"
                        )}
                    </div>

                    ${unitHtml}

                    ${weightHintHtml}
                </div>

                <button
                    type="button"
                    class="drawer-remove-button"
                    aria-label="Удалить товар"
                >
                    ✕
                </button>
            </div>

            <div class="drawer-item-editor">
                <button
                    type="button"
                    class="
                        drawer-edit-button
                        drawer-minus-button
                    "
                    aria-label="Уменьшить количество"
                >
                    −
                </button>

                <input
                    type="text"
                    class="drawer-quantity-input"
                    value="${
                        formatQuantity(
                            item.quantity
                        )
                    }"
                    inputmode="${
                        item.unit === "шт"
                            ? "numeric"
                            : "decimal"
                    }"
                    autocomplete="off"
                >

                <button
                    type="button"
                    class="
                        drawer-edit-button
                        drawer-plus-button
                    "
                    aria-label="Увеличить количество"
                >
                    +
                </button>
            </div>

            <div class="drawer-item-price">
                ≈ ${formatMoney(
                    estimatedTotal
                )} грн
            </div>
        `;

                const removeButton =
            row.querySelector(
                ".drawer-remove-button"
            );

        const minusButton =
            row.querySelector(
                ".drawer-minus-button"
            );

        const plusButton =
            row.querySelector(
                ".drawer-plus-button"
            );

        const quantityInput =
            row.querySelector(
                ".drawer-quantity-input"
            );

        const unitSelect =
            row.querySelector(
                ".drawer-unit-select"
            );

        removeButton?.addEventListener(
            "click",
            () => {
                removeFromDrawerCart(
                    item.cartKey
                );
            }
        );

        unitSelect?.addEventListener(
            "change",
            () => {
                const oldUnit = item.unit;
                const newUnit = unitSelect.value;

                if (oldUnit === newUnit) {
                    return;
                }

                if (
                    approximateWeightPerPiece <= 0
                ) {
                    return;
                }

                const currentQuantity =
                    Number(item.quantity) || 0;

                if (
                    oldUnit === "кг" &&
                    newUnit === "шт"
                ) {
                    item.quantity = Math.max(
                        1,
                        Math.round(
                            currentQuantity /
                            approximateWeightPerPiece
                        )
                    );
                }

                if (
                    oldUnit === "шт" &&
                    newUnit === "кг"
                ) {
                    item.quantity = Number(
                        (
                            currentQuantity *
                            approximateWeightPerPiece
                        ).toFixed(3)
                    );

                    item.quantity = Math.max(
                        state.drawerMode === "return"
                            ? 0.001
                            : 0.1,
                        item.quantity
                    );
                }

                item.unit = newUnit;

                refreshCart();

                if (
                    typeof triggerHaptic ===
                    "function"
                ) {
                    triggerHaptic("selection");
                }
            }
        );

        minusButton?.addEventListener(
            "click",
            () => {
                const step = getStep();

                let value =
                    Number(item.quantity) || step;

                value -= step;

                if (item.unit === "шт") {
                    value = Math.max(
                        1,
                        Math.round(value)
                    );
                } else {
                    value = Math.max(
                        step,
                        Number(value.toFixed(3))
                    );
                }

                item.quantity = value;

                refreshCart();
            }
        );

        plusButton?.addEventListener(
            "click",
            () => {
                const step = getStep();

                let value =
                    Number(item.quantity) || 0;

                value += step;

                if (item.unit === "шт") {
                    value = Math.round(value);
                } else {
                    value = Number(
                        value.toFixed(3)
                    );
                }

                item.quantity = value;

                refreshCart();
            }
        );

        quantityInput?.addEventListener(
            "change",
            () => {
                const step = getStep();

                let value =
                    parseQuantity(
                        quantityInput.value
                    );

                if (
                    !Number.isFinite(value)
                ) {
                    value = step;
                }

                if (item.unit === "шт") {
                    value = Math.max(
                        1,
                        Math.round(value)
                    );
                } else {
                    value = Math.max(
                        step,
                        Number(value.toFixed(3))
                    );
                }

                item.quantity = value;

                refreshCart();
            }
        );

        elements.drawerCartList.appendChild(
            row
        );
    });

    const active = getDrawerCart();

    const positions = active.length;

    const quantity = active.reduce(
        (sum, item) =>
            sum + Number(item.quantity || 0),
        0
    );

    const total = active.reduce(
        (sum, item) =>
            sum +
            calculateItemEstimatedTotal(item),
        0
    );

    if (elements.drawerOrderCount) {
        elements.drawerOrderCount.textContent =
            state.orderCart.length;
    }

    if (elements.drawerReturnCount) {
        elements.drawerReturnCount.textContent =
            state.returnCart.length;
    }

    if (elements.drawerCartSummary) {
        elements.drawerCartSummary.textContent =
            `Заказ: ${state.orderCart.length} · Возврат: ${state.returnCart.length}`;
    }

    if (elements.drawerPositions) {
        elements.drawerPositions.textContent =
            positions;
    }

    if (elements.drawerQuantity) {
        elements.drawerQuantity.textContent =
            formatQuantity(quantity);
    }

    if (elements.drawerTotalTitle) {
        elements.drawerTotalTitle.textContent =
            state.drawerMode === "return"
                ? "Примерная сумма возврата"
                : "Примерная сумма заказа";
    }

    if (elements.drawerTotalPrice) {
        elements.drawerTotalPrice.textContent =
            `≈ ${formatMoney(total)} грн`;
    }

    if (elements.drawerSendButton) {
        elements.drawerSendButton.disabled =
            state.orderCart.length === 0 &&
            state.returnCart.length === 0;
    }
}


function removeFromDrawerCart(cartKey) {
    if (state.drawerMode === "return") {
        state.returnCart =
            state.returnCart.filter(
                (item) =>
                    item.cartKey !== cartKey
            );
    } else {
        state.orderCart =
            state.orderCart.filter(
                (item) =>
                    item.cartKey !== cartKey
            );
    }

    saveCart();
    renderDrawerCart();
    renderCart();
    renderProducts();
    updateSummary();

    triggerHaptic("warning");
}

function bindEvents() {
    console.log("bindEvents запущена");
   if (elements.productSearch) {
    elements.productSearch.addEventListener(
        "input",
        () => {
            state.productSearchQuery =
                elements.productSearch.value.trim();

            if (state.productSearchQuery.length > 0) {
                state.selectedCategory = "Все";
                renderCategories();
            }

            renderProducts();
        }
    );
}

    elements.historyButton.addEventListener(
    "click",
    openHistory
);

    if (elements.floatingCartButton) {
        elements.floatingCartButton.onclick =
            openCartDrawer;
    }

    if (elements.cartDrawerClose) {
        elements.cartDrawerClose.onclick =
            closeCartDrawer;
    }

    if (elements.cartDrawerOverlay) {
        elements.cartDrawerOverlay.onclick =
            closeCartDrawer;
    }

    if (elements.drawerSendButton) {
        elements.drawerSendButton.onclick =
            sendOrder;
    }

    if (elements.shopSearch) {
        elements.shopSearch.addEventListener(
            "input",
            renderShopSearchResults
        );

        elements.shopSearch.addEventListener(
            "focus",
            renderShopSearchResults
        );
    }

    if (elements.clearSelectedShopButton) {
        elements.clearSelectedShopButton.addEventListener(
            "click",
            clearSelectedShop
        );
    }

    document
    .querySelectorAll(".operation-button")
    .forEach((button) => {
        button.addEventListener("click", () => {
            setActiveOperation(
                button.dataset.operation
            );
        });
    });

 document
    .querySelectorAll(".invoice-form-button")
    .forEach((button) => {
        button.addEventListener("click", () => {
            setInvoiceForm(
                button.dataset.invoiceForm
            );
        });
    });

setInvoiceForm(state.invoiceForm);

    document.addEventListener(
        "click",
        (event) => {
            const clickedInsideShopPicker =
                event.target.closest(".shop-picker");

            if (!clickedInsideShopPicker) {
                elements.shopSearchResults?.classList.remove(
                    "show"
                );
            }
        }
    );

    let touchStartY = 0;
    let touchStartX = 0;

    document.addEventListener(
        "touchstart",
        (event) => {
            const touch = event.touches[0];

            if (!touch) {
                return;
            }

            touchStartY = touch.clientY;
            touchStartX = touch.clientX;
        },
        {
            passive: true
        }
    );

    document.addEventListener(
        "touchmove",
        (event) => {
            const touch = event.touches[0];

            if (!touch) {
                return;
            }

            const distanceY = Math.abs(
                touch.clientY - touchStartY
            );

            const distanceX = Math.abs(
                touch.clientX - touchStartX
            );

            if (distanceY > 10 || distanceX > 10) {
                hideProductSearch();
            }
        },
        {
            passive: true
        }
    );

    document.addEventListener("click", (event) => {
    const button = event.target.closest(
        ".drawer-mode-button"
    );

    if (!button) {
        return;
    }

    const selectedMode =
        button.dataset.drawerMode;

    if (
        selectedMode !== "order" &&
        selectedMode !== "return"
    ) {
        console.error(
            "Неправильный режим:",
            selectedMode
        );

        return;
    }

    const drawerOrderComment =
    document.getElementById("drawerOrderComment");

const legacyOrderComment =
    document.getElementById("orderComment");

drawerOrderComment?.addEventListener(
    "input",
    () => {
        if (legacyOrderComment) {
            legacyOrderComment.value =
                drawerOrderComment.value;
        }
    }
);


    document
        .querySelectorAll(".drawer-mode-button")
        .forEach((item) => {
            item.classList.toggle(
                "active",
                item === button
            );
        });

    state.drawerMode = selectedMode;
    state.activeMode = selectedMode;

    console.log(
        "Выбран режим:",
        selectedMode
    );

    renderProducts();
    renderCart();
    renderDrawerCart();
});

    if (elements.clearCartButton) {
        elements.clearCartButton.addEventListener(
            "click",
            clearCart
        );
    }

    if (elements.sendOrderButton) {
        elements.sendOrderButton.addEventListener(
            "click",
            sendOrder
        );
    }

    if (elements.productModalClose) {
        elements.productModalClose.addEventListener(
            "click",
            closeProductModal
        );
    }

    if (elements.productModalOverlay) {
        elements.productModalOverlay.addEventListener(
            "click",
            closeProductModal
        );
    }

    const adminButton =
    document.getElementById("adminButton");

if (adminButton) {
    adminButton.addEventListener(
        "click",
        openAdminPanel
    );
}

const closeAdminButton =
    document.getElementById("closeAdminButton");

if (closeAdminButton) {
    closeAdminButton.addEventListener(
        "click",
        closeAdminPanel
    );
}

const stockHistoryButton =
    document.getElementById(
        "stockHistoryButton"
    );

if (stockHistoryButton) {
    stockHistoryButton.addEventListener(
        "click",
        () => {
            const container =
                document.getElementById(
                    "stockHistoryContainer"
                );

            if (
                container &&
                !container.hidden
            ) {
                container.hidden = true;
                return;
            }

            loadStockHistory();
        }
    );
}

const profileButton =
    document.getElementById(
        "profileButton"
    );

if (profileButton) {
    profileButton.addEventListener(
        "click",
        openProfile
    );
}

const closeProfileButton =
    document.getElementById(
        "closeProfileButton"
    );

if (closeProfileButton) {
    closeProfileButton.addEventListener(
        "click",
        closeProfile
    );
}

const adminStockSearch =
    document.getElementById("adminStockSearch");

if (adminStockSearch) {
    adminStockSearch.addEventListener(
        "input",
        renderAdminStocks
    );
}

    if (elements.largeTextToggle) {
        const toggleLargeText = (event) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            document.body.classList.toggle(
                "large-text-mode"
            );

            const enabled =
                document.body.classList.contains(
                    "large-text-mode"
                );

            elements.largeTextToggle.textContent =
                enabled
                    ? "🔎 Обычный текст"
                    : "🔎 Крупный текст";

            localStorage.setItem(
                "viar-large-text",
                enabled ? "1" : "0"
            );

            console.log(
                "Крупный текст:",
                enabled
            );
        };

        /*
         * Используем только click.
         * Не нужно одновременно onclick и touchend,
         * иначе на телефоне переключение может
         * сработать два раза подряд.
         */
        elements.largeTextToggle.addEventListener(
            "click",
            toggleLargeText
        );
    }
}

function openAdminPanel() {
    const panel =
        document.getElementById("adminPanel");

    if (!panel) {
        return;
    }

    panel.hidden = false;

    renderAdminStocks();
}

function closeAdminPanel() {
    const panel =
        document.getElementById("adminPanel");

    if (!panel) {
        return;
    }

    panel.hidden = true;
}

function renderAdminStocks() {
    const container =
        document.getElementById("adminStockList");

    const searchInput =
        document.getElementById("adminStockSearch");

    if (!container) {
        return;
    }

    const query =
        normalizeText(
            searchInput?.value || ""
        );

    const filtered =
        products.filter(product => {
            if (!query) {
                return true;
            }

            const searchable =
                normalizeText(
                    [
                        product.name,
                        product.nameRu,
                        product.orderName,
                        product.article,
                        product.searchAliases
                    ]
                        .filter(Boolean)
                        .join(" ")
                );

            return searchable.includes(query);
        });

    container.innerHTML = "";

    filtered.forEach(product => {
        const item =
            document.createElement("div");

        item.className =
            "admin-stock-item";

        item.innerHTML = `
            <div class="admin-stock-info">
                <strong>
                    ${escapeHtml(product.name)}
                </strong>

                <span>
                    Артикул: ${escapeHtml(product.article)}
                </span>

                <span>
                    Остаток:
                    ${formatStock(product.stock)}
                    ${product.stockUnit || product.unit1C || "кг"}
                </span>
            </div>

            <button
                type="button"
                class="admin-stock-edit"
                data-article="${escapeHtml(product.article)}"
            >
                Изменить
            </button>
        `;

        const editButton =
    item.querySelector(
        ".admin-stock-edit"
    );

    if (editButton) {
    editButton.addEventListener(
        "click",
        () => {
            updateProductStock(
                product
            );
        }
    );
}

        container.appendChild(item);
    });
}

async function updateProductStock(product) {
    const currentStock =
        Number(product.stock || 0);

    const unit =
        product.stockUnit ||
        product.unit1C ||
        "кг";

    const enteredValue = prompt(
        `${product.name}\n\n` +
        `Текущий остаток: ${formatStock(currentStock)} ${unit}\n\n` +
        `Введите новый остаток:`,
        String(currentStock)
    );

    if (enteredValue === null) {
        return;
    }

    const normalizedValue =
        enteredValue
            .trim()
            .replace(",", ".");

    const newStock =
        Number(normalizedValue);

    if (
        !Number.isFinite(newStock) ||
        newStock < 0
    ) {
        alert(
            "Введите корректный остаток."
        );

        return;
    }

    const tgUser =
        window.Telegram?.WebApp
            ?.initDataUnsafe
            ?.user;

    const telegramId =
        tgUser?.id
            ? String(tgUser.id)
            : "";

    const userName =
        [
            tgUser?.first_name,
            tgUser?.last_name
        ]
            .filter(Boolean)
            .join(" ");

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/stocks/${encodeURIComponent(product.article)}`,
            {
                method: "PUT",

headers: {
    "Content-Type":
        "application/json",

    "X-Telegram-Init-Data":
        window.Telegram
            ?.WebApp
            ?.initData || ""
},

                body: JSON.stringify({
                    stock: newStock,

                    telegramId:
                        telegramId,

                    userName:
                        userName,

                    comment:
                        "Ручная корректировка"
                })
            }
        );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result?.message ||
                `Ошибка API: ${response.status}`
            );
        }

        // Сразу обновляем остаток
        // в текущем массиве товаров
        product.stock =
            newStock;

        // Обновляем админку
        renderAdminStocks();

        // Обновляем карточки товаров
        renderProducts();

        alert(
            `Остаток обновлён:\n\n` +
            `${product.name}\n` +
            `${formatStock(currentStock)} ${unit}` +
            ` → ` +
            `${formatStock(newStock)} ${unit}`
        );
    }
    catch (error) {
        console.error(
            "Ошибка изменения остатка:",
            error
        );

        alert(
            "Не удалось изменить остаток:\n" +
            (error?.message || error)
        );
    }
}

async function loadMyProfile() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/profile/me`,
            {
                method: "GET",

                headers: {
                    "X-Telegram-Init-Data":
                        window.Telegram
                            ?.WebApp
                            ?.initData || ""
                },

                cache: "no-store"
            }
        );

        if (!response.ok) {
            console.error(
                "Ошибка загрузки профиля:",
                response.status
            );

            return null;
        }

        const profile =
            await response.json();
        return profile;
    }
    catch (error) {
        console.error(
            "Ошибка loadMyProfile:",
            error
        );

        return null;
    }
}

async function openProfile() {
    const panel =
        document.getElementById(
            "profilePanel"
        );

    const content =
        document.getElementById(
            "profileContent"
        );

    if (!panel || !content) {
        return;
    }

    panel.hidden = false;

    document.body.classList.add(
        "profile-open"
    );

    content.innerHTML = `
        <div class="profile-loading">
            Завантаження профілю...
        </div>
    `;

    const profile =
        await loadMyProfile();

    if (!profile) {
        content.innerHTML = `
            <div class="profile-error">
                Не вдалося завантажити профіль
            </div>
        `;

        return;
    }

    const firstLetter =
        (profile.name || "?")
            .trim()
            .charAt(0)
            .toUpperCase();

    const salesToday =
        Number(
            profile.salesToday || 0
        );

    const salesMonth =
        Number(
            profile.salesMonth || 0
        );

    const ordersToday =
        Number(
            profile.ordersToday || 0
        );

    const ordersMonth =
        Number(
            profile.ordersMonth || 0
        );

    const salesPlan =
        Number(
            profile.salesPlan || 0
        );

    const planPercent =
        salesPlan > 0
            ? Math.min(
                100,
                Math.round(
                    salesMonth /
                    salesPlan *
                    100
                )
            )
            : 0;

           const recentSales =
    Array.isArray(profile.recentSales)
        ? profile.recentSales
        : [];

const recentSalesHtml =
    recentSales.length > 0
        ? recentSales
            .map(sale => {

                let dateText = "";

                if (sale.createdAt) {
                    const date =
                        new Date(
                            sale.createdAt
                        );

                    dateText =
                        date.toLocaleString(
                            "uk-UA",
                            {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        );
                }

return `
    <div
        class="profile-sale-item"
        style="color: #17191c !important;"
    >

        <div
            class="profile-sale-main"
            style="color: #17191c !important;"
        >
            <strong
                style="
                    color: #17191c !important;
                    display: block;
                "
            >
                ${escapeHtml(
                    sale.shopName ||
                    "Торгова точка"
                )}
            </strong>

            <small
                style="
                    color: #8f949b !important;
                    display: block;
                    margin-top: 4px;
                "
            >
                ${escapeHtml(dateText)}
            </small>
        </div>

        <div
            class="profile-sale-amount"
            style="
                color: #17191c !important;
                font-weight: 800;
            "
        >
            ${formatMoney(
                Number(
                    sale.totalAmount || 0
                )
            )}

            <span
                style="color: #8f949b !important;"
            >
                грн
            </span>
        </div>

    </div>
`;
            })
            .join("")
        : `
            <div class="profile-empty-sales">
                Продажів поки немає
            </div>
        `;


content.innerHTML = `

    <div class="profile-user-card">

        <div class="profile-avatar">
            ${escapeHtml(firstLetter)}
        </div>

        <div class="profile-user-info">

            <div class="profile-user-name">
                ${escapeHtml(
                    profile.name ||
                    "Торговий представник"
                )}
            </div>

            <div class="profile-user-username">
                ${
                    profile.username
                        ? "@" +
                          escapeHtml(
                              profile.username
                          )
                        : "Telegram"
                }
            </div>

        </div>

    </div>


    <div class="profile-section-title">
        📊 Продажі
    </div>

    <div class="profile-stats-grid">

        <div class="profile-stat-box">

            <div class="profile-stat-icon">
                ☀️
            </div>

            <div class="profile-stat-label">
                Сьогодні
            </div>

            <div class="profile-stat-number">
                ${formatMoney(salesToday)}
                <span>грн</span>
            </div>

            <div class="profile-stat-secondary">
                ${ordersToday}
                замовлень
            </div>

        </div>


        <div class="profile-stat-box">

            <div class="profile-stat-icon">
                📅
            </div>

            <div class="profile-stat-label">
                За місяць
            </div>

            <div class="profile-stat-number">
                ${formatMoney(salesMonth)}
                <span>грн</span>
            </div>

            <div class="profile-stat-secondary">
                ${ordersMonth}
                замовлень
            </div>

        </div>

    </div>


    <div class="profile-section-title">
        🎯 План продажів
    </div>

    <div class="profile-plan-card">

        <div class="profile-plan-row">

            <div>
                <div class="profile-plan-value">
                    ${formatMoney(salesMonth)}
                </div>

                <div class="profile-plan-caption">
                    виконано
                </div>
            </div>

            <div class="profile-plan-right">

                <strong>
                    ${planPercent}%
                </strong>

                <span>
                    з ${formatMoney(salesPlan)} грн
                </span>

            </div>

        </div>

        <div class="profile-progress">
            <div
                class="profile-progress-fill"
                style="width: ${planPercent}%"
            ></div>
        </div>

    </div>


    <div class="profile-section-title">
        📦 Останні продажі
    </div>

    <div class="profile-sales-list">
        ${recentSalesHtml}
    </div>


    <div class="profile-section-title">
        📋 Робота
    </div>

    <div class="profile-menu">

        <button
            type="button"
            class="profile-menu-item"
            id="profileTasksButton"
        >
            <span>📋</span>

            <div>
                <strong>
                    Мої завдання
                </strong>

                <small>
                    Поточні задачі
                </small>
            </div>

            <b>›</b>
        </button>


        <button
            type="button"
            class="profile-menu-item"
            id="profileOrdersButton"
        >
            <span>📦</span>

            <div>
                <strong>
                    Мої замовлення
                </strong>

                <small>
                    Історія продажів
                </small>
            </div>

            <b>›</b>
        </button>

    </div>
`;
}

function closeProfile() {
    const panel =
        document.getElementById(
            "profilePanel"
        );

    if (!panel) {
        return;
    }

    panel.hidden = true;

    document.body.classList.remove(
        "profile-open"
    );
}

async function loadStockHistory() {
    const container =
        document.getElementById(
            "stockHistoryContainer"
        );

    if (!container) {
        return;
    }

    container.hidden = false;
    container.innerHTML =
        "<p>Загрузка истории...</p>";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/stocks/history?limit=50`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Ошибка API: ${response.status}`
            );
        }

        const history =
            await response.json();

        if (!history.length) {
            container.innerHTML =
                "<p>История пока пустая.</p>";

            return;
        }

        container.innerHTML = "";

        history.forEach(item => {
            const product =
                products.find(p =>
                    String(p.article) ===
                    String(item.article)
                );

            const productName =
                product?.name ||
                `Артикул ${item.article}`;

            const unit =
                product?.stockUnit ||
                product?.unit1C ||
                "кг";

            const date =
                new Date(item.createdAt);

            const dateText =
                date.toLocaleString(
                    "ru-RU",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

            const element =
                document.createElement("div");

            element.className =
                "admin-history-item";

            element.innerHTML = `
                <strong>
                    📦 ${escapeHtml(productName)}
                </strong>

                <div>
                    ${formatStock(item.oldStock)}
                    →
                    ${formatStock(item.newStock)}
                    ${escapeHtml(unit)}
                </div>

                <small>
                    ✏️ ${
                        escapeHtml(
                            item.comment ||
                            "Ручная корректировка"
                        )
                    }
                </small>

                <small>
                    👤 ${
                        escapeHtml(
                            item.changedByName ||
                            "Не указан"
                        )
                    }
                </small>

                <small>
                    🕒 ${escapeHtml(dateText)}
                </small>
            `;

            container.appendChild(
                element
            );
        });
    }
    catch (error) {
        console.error(
            "Ошибка истории остатков:",
            error
        );

        container.innerHTML =
            "<p>Не удалось загрузить историю.</p>";
    }
}

async function openHistory() {
    const shopId =
        Number(elements.selectedShopId.value);

    if (!shopId) {
        showToast(
            "Спочатку оберіть торгову точку",
            "error"
        );

        return;
    }

    elements.historyContainer.hidden = false;

    elements.historyContainer.innerHTML = `
        <div class="history-loading">
            ⏳ Завантаження історії...
        </div>
    `;

    elements.historyButton.disabled = true;

   try {
    const response = await fetch(
        `${API_BASE_URL}/api/shops/${shopId}/orders?days=60`,
        {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        }
    );


        if (!response.ok) {
            throw new Error(
                `Помилка API: ${response.status}`
            );
        }

        const data = await response.json();

        const orders =
            Array.isArray(data.orders)
                ? data.orders
                : [];

        renderOrderHistory(orders);
    }
    catch (error) {
        console.error(
            "Помилка завантаження історії:",
            error
        );

        elements.historyContainer.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">
                    ❌
                </div>

                <strong>
                    Не вдалося завантажити історію
                </strong>

                <span>
                    Перевірте, чи запущений бот та API.
                </span>
            </div>
        `;
    }
    finally {
        elements.historyButton.disabled = false;
    }
}

function renderOrderHistory(orders) {
    if (!Array.isArray(orders) ||
        orders.length === 0) {
        elements.historyContainer.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">
                    📭
                </div>

                <strong>
                    Історія замовлень відсутня
                </strong>

                <span>
                    За останні 60 днів замовлень немає.
                </span>
            </div>
        `;

        return;
    }

    /*
     * Пока показываем пять последних заказов.
     */
    const latestOrders =
        orders.slice(0, 5);

    elements.historyContainer.innerHTML = `
        <div class="history-header">
            <div>
                <strong>
                    Історія замовлень
                </strong>

                <span>
                    Останні ${latestOrders.length}
                </span>
            </div>

            <button
                type="button"
                class="history-close-button"
                id="closeHistoryButton"
                aria-label="Закрити історію"
            >
                ✕
            </button>
        </div>

        <div class="history-orders-list">
            ${latestOrders
                .map(
                    (order, index) =>
                        createHistoryOrderHtml(
                            order,
                            index
                        )
                )
                .join("")}
        </div>
    `;

    bindHistoryButtons(latestOrders);

    document
        .getElementById("closeHistoryButton")
        ?.addEventListener(
            "click",
            closeOrderHistory
        );
}

async function setMyStartingSales() {
    const amountText =
        prompt(
            "Введите сумму продаж до запуска бота:",
            "0"
        );

    if (amountText === null) {
        return;
    }

    const amount =
        Number(
            amountText
                .trim()
                .replace(",", ".")
        );

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        alert("Некорректная сумма");
        return;
    }

    const now =
        new Date();

    const response = await fetch(
        `${API_BASE_URL}/api/admin/sales-adjustment`,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json",

                "X-Telegram-Init-Data":
                    window.Telegram
                        ?.WebApp
                        ?.initData || ""
            },

            body: JSON.stringify({
                telegramId:
                    564525966,

                year:
                    now.getFullYear(),

                month:
                    now.getMonth() + 1,

                amount:
                    amount,

                comment:
                    "Продажи до запуска системы"
            })
        }
    );

    if (!response.ok) {
        alert(
            "Не удалось сохранить сумму"
        );

        return;
    }

    alert(
        "Начальные продажи сохранены"
    );
}

function createHistoryOrderHtml(
    order,
    index
) {
    const items =
        Array.isArray(order.items)
            ? order.items
            : [];

    const dateText =
        formatHistoryDate(order.createdAt);

    const invoiceForm =
        String(order.invoiceForm || "2")
            .replace("Ф", "");

    const itemsHtml =
        items.length > 0
            ? items
                .map((item) => {
                    const quantity =
                        formatHistoryQuantity(
                            item.quantity
                        );

                    return `
                        <div class="history-product-row">
                            <div class="history-product-info">
                                <strong>
                                    ${escapeHtml(
                                        item.productName ||
                                        item.name ||
                                        "Товар"
                                    )}
                                </strong>

                                ${
                                    item.article
                                        ? `
                                        <span>
                                            Артикул:
                                            ${escapeHtml(
                                                item.article
                                            )}
                                        </span>
                                        `
                                        : ""
                                }
                            </div>

                            <div class="history-product-quantity">
                                ${quantity}
                                ${escapeHtml(
                                    item.unit || ""
                                )}
                            </div>
                        </div>
                    `;
                })
                .join("")
            : `
                <div class="history-no-products">
                    У замовленні немає позицій
                </div>
            `;

    return `
        <article class="history-order-card">
            <div class="history-order-top">
                <div class="history-order-date">
                    <span class="history-order-calendar">
                        📅
                    </span>

                    <div>
                        <strong>
                            ${dateText}
                        </strong>

                        <span>
                            Накладна ${invoiceForm}Ф
                        </span>
                    </div>
                </div>

                <span class="history-order-count">
                    ${items.length} поз.
                </span>
            </div>

            <div class="history-order-products">
                ${itemsHtml}
            </div>

            <button
                type="button"
                class="repeat-order-button"
                data-history-order-index="${index}"
                ${items.length === 0 ? "disabled" : ""}
            >
                🔄 Повторити замовлення
            </button>
        </article>
    `;
}

function bindHistoryButtons(orders) {
    document
        .querySelectorAll(
            "[data-history-order-index]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const index =
                        Number(
                            button.dataset
                                .historyOrderIndex
                        );

                    const order =
                        orders[index];

                    if (!order) {
                        return;
                    }

                    repeatHistoryOrder(order);
                }
            );
        });
}

function repeatHistoryOrder(historyOrder) {
    const historyItems =
        Array.isArray(historyOrder.items)
            ? historyOrder.items
            : [];

    if (historyItems.length === 0) {
        showToast(
            "У цьому замовленні немає товарів",
            "error"
        );

        return;
    }

    let addedCount = 0;
    let unavailableCount = 0;

    historyItems.forEach(
        (historyItem) => {
            const product =
                findProductForHistoryItem(
                    historyItem
                );

            /*
             * Товара уже нет в актуальном
             * списке products.
             */
            if (!product) {
                unavailableCount++;
                return;
            }

            const quantity =
                Number(historyItem.quantity);

            if (!Number.isFinite(quantity) ||
                quantity <= 0) {
                return;
            }

            const unit =
                historyItem.unit ||
                product.unit ||
                "кг";

            const existingItem =
                state.orderCart.find(
                    (cartItem) =>
                        Number(cartItem.productId) ===
                            Number(product.id) &&
                        cartItem.unit === unit
                );

            if (existingItem) {
    if (!existingItem.cartKey) {
        existingItem.cartKey =
            createCartKey();
    }

    existingItem.price = Number(
        product.price ??
        product.Price ??
        existingItem.price ??
        0
    );

    existingItem.approximateWeightPerPiece =
        Number(
            product.approximateWeightPerPiece ??
            product.ApproximateWeightPerPiece ??
            existingItem.approximateWeightPerPiece ??
            0
        );

    existingItem.canOrderByPiece = Boolean(
        product.canOrderByPiece ??
        product.CanOrderByPiece ??
        existingItem.canOrderByPiece ??
        false
    );

    existingItem.quantity =
        roundCartQuantity(
            Number(existingItem.quantity) +
            quantity
        );
}
            else {
    state.orderCart.push({
        cartKey: createCartKey(),

        productId: product.id,

        article:
            product.article ||
            historyItem.article ||
            "",

        name:
            product.name ||
            historyItem.productName ||
            historyItem.name ||
            "Товар",

        price: Number(
            product.price ??
            product.Price ??
            historyItem.price ??
            0
        ),

        approximateWeightPerPiece: Number(
            product.approximateWeightPerPiece ??
            product.ApproximateWeightPerPiece ??
            historyItem.approximateWeightPerPiece ??
            0
        ),

        canOrderByPiece: Boolean(
            product.canOrderByPiece ??
            product.CanOrderByPiece ??
            false
        ),

        unit,

        quantity:
            roundCartQuantity(quantity)
    });
}

            addedCount++;
        }
    );

    saveCart();
    renderCart();
    renderProducts();
    renderDrawerCart();

    if (addedCount === 0) {
        showToast(
            "Товари з цього замовлення не знайдені",
            "error"
        );

        return;
    }

    closeOrderHistory();

    let message =
        `Додано позицій: ${addedCount}`;

    if (unavailableCount > 0) {
        message +=
            `. Не знайдено: ${unavailableCount}`;
    }

    showToast(
        message,
        "success"
    );

    triggerHaptic("success");
}

function findProductForHistoryItem(
    historyItem
) {
    const historyProductId =
        Number(historyItem.productId);

    if (historyProductId) {
        const byId =
            products.find(
                (product) =>
                    Number(product.id) ===
                    historyProductId
            );

        if (byId) {
            return byId;
        }
    }

    const article =
        String(historyItem.article || "")
            .trim();

    if (article) {
        const byArticle =
            products.find(
                (product) =>
                    String(
                        product.article || ""
                    ).trim() === article
            );

        if (byArticle) {
            return byArticle;
        }
    }

    return null;
}

function formatHistoryDate(value) {
    if (!value) {
        return "Дата не вказана";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(
        "uk-UA",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function formatHistoryQuantity(value) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString(
        "uk-UA",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        }
    );
}

function roundCartQuantity(value) {
    return Math.round(
        (Number(value) +
            Number.EPSILON) *
        1000
    ) / 1000;
}

function closeOrderHistory() {
    elements.historyContainer.hidden = true;
    elements.historyContainer.innerHTML = "";
}

function setInvoiceForm(form) {
    if (form !== "1" && form !== "2") {
        return;
    }

    state.invoiceForm = form;

    document
        .querySelectorAll(".invoice-form-button")
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.invoiceForm === form
            );
        });
}

function hideProductSearch() {
    if (!elements.productSearch) return;

    // Если поле не активно — ничего не делаем
    if (document.activeElement !== elements.productSearch) {
        return;
    }

    // Закрываем клавиатуру
    elements.productSearch.blur();

    // Очищаем только текст в поле
    elements.productSearch.value = "";

    // ВАЖНО:
    // state.productSearchQuery НЕ очищаем,
    // поэтому найденные товары остаются на экране.
}
  

function closeProductModal() {
    if (!elements.productModal) {
        return;
    }

    elements.productModal.classList.remove("show");
    document.body.style.overflow = "";

    if (elements.productModalImage) {
        elements.productModalImage.removeAttribute("src");
        elements.productModalImage.style.display = "none";
    }

    if (elements.productImageLoading) {
        elements.productImageLoading.style.display = "flex";
        elements.productImageLoading.textContent =
            "Загрузка фото...";
    }
}

async function sendOrder() {
   const selectedShopId =
    Number(elements.selectedShopId.value);

    const selectedShop =
        shops.find(
            (shop) =>
                shop.id ===
                selectedShopId
        );

    if (!selectedShop) {
        showToast(
            "Выберите торговую точку",
            "error"
        );

        elements.shopSelect.focus();
        triggerHaptic("error");
        return;
    }

    renderDrawerCart();
    closeCartDrawer();

    const orderIsEmpty =
        state.orderCart.length === 0;

    const returnIsEmpty =
        state.returnCart.length === 0;

    if (orderIsEmpty && returnIsEmpty) {
        showToast(
            "Добавьте заказ или возврат",
            "error"
        );

        triggerHaptic("error");
        return;
    }

    const telegramUser =
        telegram?.initDataUnsafe?.user;

  const mapCartItem = (item) => {
    const product = products.find(
        product =>
            Number(product.id) ===
            Number(item.productId)
    );

    const orderName =
        product?.orderName?.trim() ||
        item.orderName?.trim() ||
        item.name;

    return {
        productId: item.productId,
        article:
            item.article ||
            product?.article ||
            "",
        name: orderName,
        unit: item.unit,
        quantity: item.quantity
    };
};


    const order = {
        orderId: createOrderId(),

       shop: {
    id: selectedShop.id,
    name: getShopDisplayName(selectedShop),
district: selectedShop.district,
    address: selectedShop.address
},

invoiceForm: state.invoiceForm,

        salesRepresentative: {
            telegramId:
                telegramUser?.id ?? null,

            username:
                telegramUser?.username ?? null,

            firstName:
                telegramUser?.first_name ??
                "Не указан",

            lastName:
                telegramUser?.last_name ?? ""
        },

        orderItems:
            state.orderCart.map(
                mapCartItem
            ),

        returnItems:
            state.returnCart.map(
                mapCartItem
            ),

        comment:
    document
        .getElementById("drawerOrderComment")
        ?.value
        ?.trim() || "",

        createdAt:
            new Date().toISOString()
    };

    const json =
    JSON.stringify(order);

console.log(
    "Отправляем:",
    order
);

const openedOutsideTelegram =
    !telegram ||
    telegram.platform === "unknown";

if (openedOutsideTelegram) {
    showOrderForBrowserTesting(json);
    return;
}

try {
    const response = await fetch(
        `${API_BASE_URL}/api/orders`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",

                "X-Telegram-Init-Data":
                    window.Telegram
                        ?.WebApp
                        ?.initData || ""
            },

            body: json
        }
    );

    let result = null;

    try {
        result =
            await response.json();
    }
    catch {
        result = null;
    }

    if (!response.ok) {
        throw new Error(
            result?.message ||
            `Ошибка API: ${response.status}`
        );
    }

    console.log(
        "Заказ успешно отправлен:",
        result
    );

    // Очищаем заказ
    state.orderCart = [];
    state.returnCart = [];

    saveCart();

    // Очищаем комментарий
    const drawerComment =
        document.getElementById(
            "drawerOrderComment"
        );

    if (drawerComment) {
        drawerComment.value = "";
    }

    // Обновляем интерфейс
    renderCart();
    renderProducts();

    showToast(
        "Заказ отправлен",
        "success"
    );

    triggerHaptic("success");
}
catch (error) {
    console.error(
        "Ошибка отправки заказа:",
        error
    );

    alert(
        "Ошибка отправки заказа:\n\n" +
        (error?.message || error)
    );

    showToast(
        "Не удалось отправить",
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
        const cartData = {
            orderCart: state.orderCart,
            returnCart: state.returnCart
        };

        localStorage.setItem(
            "viar-mini-app-carts-v2",
            JSON.stringify(cartData)
        );
    } catch (error) {
        console.warn(
            "Не удалось сохранить корзины:",
            error
        );
    }
}

function setActiveOperation(operation) {
    if (
        operation !== "order" &&
        operation !== "return"
    ) {
        return;
    }

    state.activeMode = operation;

    document
        .querySelectorAll(".operation-button")
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.operation === operation
            );
        });

    renderProducts();
    renderCart();
}

function createCartKey() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2)
    );
}

function loadCart() {
    try {
        const savedData =
            localStorage.getItem(
                "viar-mini-app-carts-v2"
            );

        if (!savedData) {
            state.orderCart = [];
            state.returnCart = [];
            return;
        }

        const parsedData =
            JSON.parse(savedData);

        const savedOrderCart =
            Array.isArray(parsedData.orderCart)
                ? parsedData.orderCart
                : [];

        const savedReturnCart =
            Array.isArray(parsedData.returnCart)
                ? parsedData.returnCart
                : [];

        /*
         * Добавляем cartKey старым позициям,
         * у которых его ещё нет.
         */
        state.orderCart =
            savedOrderCart.map((item) => ({
                ...item,
                cartKey:
                    item.cartKey ||
                    createCartKey()
            }));

        state.returnCart =
            savedReturnCart.map((item) => ({
                ...item,
                cartKey:
                    item.cartKey ||
                    createCartKey()
            }));

        /*
         * Сохраняем уже исправленную корзину.
         */
        saveCart();
    } catch (error) {
        console.warn(
            "Не удалось загрузить корзины:",
            error
        );

        state.orderCart = [];
        state.returnCart = [];
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
    return String(value ?? "")
        .toLowerCase()
        .trim()
        .replaceAll("ё", "е")
        .replaceAll("і", "и")
        .replaceAll("ї", "и")
        .replaceAll("є", "е")
        .replaceAll("ґ", "г")
        .replaceAll("’", "")
        .replaceAll("'", "")
        .replaceAll("`", "")
        .replace(/\s+/g, " ");
}

function parseQuantity(value) {
    const normalizedValue = String(value)
        .replace(",", ".")
        .trim();

    const result = Number.parseFloat(normalizedValue);

    return Number.isFinite(result) ? result : 0;
}

function roundQuantity(value) {
    return Math.round(
        (Number(value) + Number.EPSILON) * 1000
    ) / 1000;
}

function formatQuantity(value) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 3
    }).format(value);
}

function formatInputQuantity(value, step) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return step === 1 ? "1" : String(step);
    }

    if (step === 1) {
        return String(Math.round(number));
    }

    if (step === 0.001) {
        return number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    }

    return number.toFixed(1);
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

function openProductModal(product) {
    if (!elements.productModal) {
        return;
    }

    elements.productModalName.textContent =
        product.name || "Без названия";

    elements.productModalArticle.textContent =
        product.article || "Не указан";

    elements.productModalPrice.textContent =
        Number(product.price) > 0
            ? `${formatMoney(product.price)} грн/кг`
            : "Не указана";

    elements.productModalWeight.textContent =
        Number(product.approximateWeightPerPiece) > 0
            ? `${formatQuantity(
                product.approximateWeightPerPiece
            )} кг`
            : "Не указан";

    elements.productModalAvailability.textContent =
    product.isAvailable
        ? `🟢 В наличии · Остаток: ${formatStock(product.stock)} кг`
        : "🔴 Нет в наличии";

    elements.productModalImage.removeAttribute("src");
    elements.productModalImage.style.display = "none";
    elements.productImageLoading.style.display = "flex";
    elements.productImageLoading.textContent =
        "Загрузка фото...";

    if (product.imageUrl) {
        elements.productModalImage.onload = () => {
            elements.productImageLoading.style.display =
                "none";

            elements.productModalImage.style.display =
                "block";
        };

        elements.productModalImage.onerror = () => {
            elements.productModalImage.style.display =
                "none";

            elements.productImageLoading.style.display =
                "flex";

            elements.productImageLoading.textContent =
                "Фото не найдено";
        };

        /*
         * Фото начинает загружаться только сейчас,
         * после нажатия кнопки информации.
         */
        elements.productModalImage.src =
            `${product.imageUrl}?v=1`;
    } else {
        elements.productImageLoading.textContent =
            "Фото отсутствует";
    }

    elements.productModal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function formatStock(value) {
    const stock = Number(value);

    if (!Number.isFinite(stock)) {
        return "0";
    }

    return stock.toLocaleString("uk-UA", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    });
}
