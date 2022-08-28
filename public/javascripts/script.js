function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
            }
        }
    })
}
function removeFromCart(cartId, proId) {
    let cart = cartId
    let product = proId

    $.ajax({
        url: '/remove-from-cart',
        data: {
            cart_id: cart,
            product_id: product
        },
        method: 'post',
        success: (response) => {
            if (response.removeProduct) {
                alert("Product Removed From Cart")
                location.reload()
            }
        }
    })
}