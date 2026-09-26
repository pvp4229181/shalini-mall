const CART_KEY='shalini-mall-cart';
const readCart=()=>JSON.parse(localStorage.getItem(CART_KEY)||'[]');
const saveCart=cart=>{localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart();};
function addToCart(id,qty=1){const cart=readCart(), item=cart.find(x=>x.id===id); item?item.qty+=qty:cart.push({id,qty});saveCart(cart);openPanel('cart');showToast('Artwork added to your collection');}
function changeQty(id,delta){const cart=readCart(),item=cart.find(x=>x.id===id);if(!item)return;item.qty+=delta;saveCart(cart.filter(x=>x.qty>0));}
function removeFromCart(id){saveCart(readCart().filter(x=>x.id!==id));}
function renderCart(){
 const cart=readCart(), host=document.querySelector('#cartItems'),count=cart.reduce((a,b)=>a+b.qty,0);
 document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=count);
 if(!host)return;
 if(!cart.length){host.innerHTML='<div class="empty-state"><p>Your collection is waiting.</p><a href="shop.html" class="text-link">Explore artworks</a></div>';document.querySelector('#cartSubtotal').textContent=money(0);return;}
 host.innerHTML=cart.map(row=>{const p=ART_PRODUCTS.find(x=>x.id===row.id);return `<article class="cart-item"><a class="cart-thumb" href="product.html?id=${p.id}" style="--crop:${p.crop}"><img src="assets/images/collection-hero.png" alt="${p.title}"></a><div><div class="cart-line"><a href="product.html?id=${p.id}">${p.title}</a><button aria-label="Remove ${p.title}" onclick="removeFromCart('${p.id}')">Remove</button></div><small>${p.category} · ${p.size}</small><div class="cart-line"><div class="qty"><button aria-label="Decrease quantity" onclick="changeQty('${p.id}',-1)">−</button><span>${row.qty}</span><button aria-label="Increase quantity" onclick="changeQty('${p.id}',1)">+</button></div><span>${money(p.price*row.qty)}</span></div></div></article>`}).join('');
 document.querySelector('#cartSubtotal').textContent=money(cart.reduce((s,row)=>s+ART_PRODUCTS.find(p=>p.id===row.id).price*row.qty,0));
}
window.addToCart=addToCart;window.changeQty=changeQty;window.removeFromCart=removeFromCart;window.renderCart=renderCart;
