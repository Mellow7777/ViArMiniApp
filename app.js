"use strict";

const telegram = window.Telegram?.WebApp;

let products = [];
let shops = [];

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

initializeApp();

async function initializeApp() {
    loadCart();
    initializeTelegram();
    renderUser();
    bindEvents();

    await Promise.all([
        loadProducts(),
        loadShops()
    ]);

    restoreSelectedShop();

    renderGroups();
    renderProducts();
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

        const loadedProducts = await response.json();

        if (!Array.isArray(loadedProducts)) {
            throw new Error(
                "products.json должен содержать массив"
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

function getFilteredShops() {
    const searchText = normalizeText(
        elements.shopSearch?.value ?? ""
    );

    if (searchText.length === 0) {
        return [];
    }

    return shops
        .filter((shop) => {
            const searchableText =
                normalizeText(
                    `${shop.name} ${shop.address}`
                );

            return searchableText.includes(
                searchText
            );
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
                ${escapeHtml(shop.name)}
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
        shop.name;

    elements.selectedShopAddress.textContent =
        shop.address || "Адрес не указан";

    elements.selectedShopCard.hidden = false;

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
        const matchesGroup =
            state.selectedGroup === "Все" ||
            product.group === state.selectedGroup;

        const searchableText = normalizeText(
            [
                product.name,
                product.russianName,
                product.article,
                product.group
            ]
                .filter(Boolean)
                .join(" ")
        );

        const matchesSearch =
            searchText.length === 0 ||
            searchableText.includes(searchText);

        return matchesGroup && matchesSearch;
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
    card.id = `product-${product.id}`;

    const isAvailable =
        product.isAvailable === true;

    const canAddProduct =
    state.activeMode === "return" ||
    isAvailable;

    let selectedUnit = "кг";

    const canOrderByPiece =
        product.canOrderByPiece === true &&
        Number(product.approximateWeightPerPiece) > 0;

    const unitSwitchHtml = canOrderByPiece
        ? `
            <div class="unit-switch">
                <button
                    type="button"
                    class="unit-switch-button active"
                    data-unit="кг"
                >
                    кг
                </button>

                <button
                    type="button"
                    class="unit-switch-button"
                    data-unit="шт"
                >
                    шт
                </button>
            </div>
        `
        : "";

    card.innerHTML = `
        <div class="product-top">
            <div class="product-info">
                <h3 class="product-name">
                    ${escapeHtml(product.name)}
                </h3>
                <button
    type="button"
    class="info-button"
    aria-label="Информация о товаре"
>
    i
</button>

                <div class="product-meta">
                    <span class="product-code">
                        Артикул: ${escapeHtml(product.article)}
                    </span>

                    <span class="product-unit">
                        Цена: ${formatMoney(product.price)} грн/кг
                    </span>
                </div>

                ${
                    canOrderByPiece
                        ? `
                            <div class="product-weight">
                                Примерный вес 1 шт:
                                ${formatQuantity(
                                    product.approximateWeightPerPiece
                                )} кг
                            </div>
                        `
                        : ""
                }

                <div class="availability ${
                    isAvailable
                        ? "available"
                        : "unavailable"
                }">
                    ${
                        isAvailable
                            ? "🟢 В наличии"
                            : "🔴 Нет в наличии"
                    }
                </div>
            </div>
        </div>

        ${unitSwitchHtml}

        <div class="product-controls">
            <div class="quantity-control">
                <button
                    type="button"
                    class="quantity-button minus-button"
                    ${canAddProduct ? "" : "disabled"}
                >
                    −
                </button>

                <input
                    type="number"
                    class="quantity-input"
                    value="0.1"
                    min="0.1"
                    step="0.1"
                    inputmode="decimal"
                    ${canAddProduct ? "" : "disabled"}
                >

                <button
                    type="button"
                    class="quantity-button plus-button"
                    ${canAddProduct ? "" : "disabled"}
                >
                    +
                </button>
            </div>

            <div class="product-estimated-total">
                ≈ 0 грн
            </div>

           <button
    type="button"
    class="add-button"
    ${canAddProduct ? "" : "disabled"}
>
    ${
        canAddProduct
            ? state.activeMode === "return"
                ? "Добавить в возврат"
                : "Добавить в заказ"
            : "Нет в наличии"
    }
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

    function getStep() {
        return selectedUnit === "шт"
            ? 1
            : 0.1;
    }

    function updateQuantitySettings() {
        const step = getStep();

        quantityInput.step = step;
        quantityInput.min = step;
        quantityInput.value =
            selectedUnit === "шт"
                ? "1"
                : "0.1";

        updateEstimatedTotal();
    }

    function calculateEstimatedTotal() {
        const quantity =
            parseQuantity(quantityInput.value);

        let estimatedWeight;

        if (selectedUnit === "шт") {
            estimatedWeight =
                quantity *
                Number(
                    product.approximateWeightPerPiece || 0
                );
        } else {
            estimatedWeight = quantity;
        }

        return roundMoney(
            estimatedWeight *
            Number(product.price || 0)
        );
    }


    function updateEstimatedTotal() {
        const total =
            calculateEstimatedTotal();

        estimatedTotalElement.textContent =
            `≈ ${formatMoney(total)} грн`;
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

    if (elements.floatingCartCount) {
    elements.floatingCartCount.textContent =
        totalItemsCount;
}

if (elements.floatingCartButton) {
    elements.floatingCartButton.classList.toggle(
        "has-items",
        totalItemsCount > 0
    );
}    

    if (elements.cartBadge) {
        elements.cartBadge.textContent =
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
        const orderTotal =
            calculateCartTotal();

        elements.totalPrice.textContent =
            `≈ ${formatMoney(orderTotal)} грн`;
    }

    const nothingToSend =
        state.orderCart.length === 0 &&
        state.returnCart.length === 0;

    if (elements.sendOrderButton) {
        elements.sendOrderButton.disabled =
            nothingToSend;
    }

    if (telegram?.MainButton) {
        if (nothingToSend) {
            telegram.MainButton.disable();
            telegram.MainButton.setText(
                "КОРЗИНЫ ПУСТЫ"
            );
        } else {
            telegram.MainButton.enable();
            telegram.MainButton.setText(
                `ОТПРАВИТЬ · ${totalItemsCount}`
            );
        }
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

    activeCart.forEach((item) => {
        const row = document.createElement("div");

        row.className = "drawer-cart-item";

        const estimatedWeight =
            calculateItemEstimatedWeight(item);

        const estimatedTotal =
            calculateItemEstimatedTotal(item);

        const priceHtml =
            state.drawerMode === "order"
                ? `
                    <div class="drawer-cart-item-price">
                        ≈ ${formatMoney(
                            estimatedTotal
                        )} грн
                    </div>
                `
                : "";

        row.innerHTML = `
            <div class="drawer-cart-item-info">
                <strong>
                    ${escapeHtml(item.name)}
                </strong>

                <span>
                    ${formatQuantity(item.quantity)}
                    ${escapeHtml(item.unit)}
                </span>

                ${
                    item.unit === "шт"
                        ? `
                            <small>
                                ≈ ${formatQuantity(
                                    estimatedWeight
                                )} кг
                            </small>
                        `
                        : ""
                }

                ${priceHtml}
            </div>

            <button
                type="button"
                class="drawer-remove-button"
            >
                ✕
            </button>
        `;

        const removeButton =
            row.querySelector(
                ".drawer-remove-button"
            );

        removeButton.addEventListener("click", () => {
            removeFromDrawerCart(item.cartKey);
        });

        elements.drawerCartList.appendChild(row);
    });

    const positions = activeCart.length;

    const quantity = activeCart.reduce(
        (sum, item) => sum + item.quantity,
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
            `Заказ: ${state.orderCart.length} · ` +
            `Возврат: ${state.returnCart.length}`;
    }

    if (elements.drawerPositions) {
        elements.drawerPositions.textContent =
            positions;
    }

    if (elements.drawerQuantity) {
        elements.drawerQuantity.textContent =
            formatQuantity(quantity);
    }

    if (elements.drawerTotalPrice) {
        elements.drawerTotalPrice.textContent =
            `≈ ${formatMoney(
                calculateCartTotal()
            )} грн`;
    }

    const nothingToSend =
        state.orderCart.length === 0 &&
        state.returnCart.length === 0;

    if (elements.drawerSendButton) {
        elements.drawerSendButton.disabled =
            nothingToSend;
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
    if (elements.productSearch) {
    elements.productSearch.addEventListener("input", () => {
        const searchText =
            elements.productSearch.value.trim();

        // При поиске ищем сразу среди всех групп
        if (searchText.length > 0) {
            state.selectedGroup = "Все";
            renderGroups();
        }

        renderProducts();
    });
}
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

document.addEventListener("click", (event) => {
    const clickedInsideShopPicker =
        event.target.closest(".shop-picker");

    if (!clickedInsideShopPicker) {
        elements.shopSearchResults?.classList.remove(
            "show"
        );
    }
});

    document
        .querySelectorAll(".drawer-mode-button")
        .forEach((button) => {
            button.addEventListener("click", () => {
                document
                    .querySelectorAll(".drawer-mode-button")
                    .forEach((item) => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");

                state.drawerMode =
                    button.dataset.drawerMode;

                renderDrawerCart();
            });
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

    document
        .querySelectorAll(".operation-button")
        .forEach((button) => {
            button.addEventListener("click", () => {
                document
                    .querySelectorAll(".operation-button")
                    .forEach((item) => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");

                state.activeMode =
                    button.dataset.operation;

                renderProducts();
                renderCart();
                updateSummary();
            });
        });
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

function sendOrder() {
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

    const mapCartItem = (item) => ({
        productId: item.productId,
        article: item.article,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity
    });

    const order = {
        orderId: createOrderId(),

       shop: {
    id: selectedShop.id,
    name: selectedShop.name,
    address: selectedShop.address
},

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
            elements.orderComment
                .value
                .trim(),

        createdAt:
            new Date().toISOString()
    };

    const json =
        JSON.stringify(order);

    console.log("Отправляем:", order);

    const openedOutsideTelegram =
        !telegram ||
        telegram.platform === "unknown";

    if (openedOutsideTelegram) {
        showOrderForBrowserTesting(json);
        return;
    }

    try {
        telegram.sendData(json);

        state.orderCart = [];
        state.returnCart = [];

        saveCart();

        elements.orderComment.value = "";

        renderCart();
        renderProducts();

        triggerHaptic("success");
    } catch (error) {
        console.error(
            "Ошибка отправки:",
            error
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

        state.orderCart =
            Array.isArray(
                parsedData.orderCart
            )
                ? parsedData.orderCart
                : [];

        state.returnCart =
            Array.isArray(
                parsedData.returnCart
            )
                ? parsedData.returnCart
                : [];
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
            ? "🟢 В наличии"
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
