const { response } = require('express');
var express = require('express');
var proudectHelpers = require('../helpers/product-helpers');
var router = express.Router();
var userHelpers = require('../helpers/user-helpers')
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  //console.log(user);
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  // console.log(user);
  proudectHelpers.getAllproduct().then((products) => {
    // console.log(cartCount);
    res.render('user/view-products', { admin: false, products, user, cartCount });
  })
})
router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { "LoginErr": req.session.logInErr });
    req.session.logInErr = false
  }
})
router.get('/signup', (req, res) => {
  res.render('user/signup');
});
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    // console.log(response);
    req.session.loggedIn = true
    req.session.user = response
    res.redirect('/')
  });
});
router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.loggedIn = true
      res.redirect('/')
    } else {
      req.session.logInErr = "Invalid Username or Password"
      res.redirect('/login')
    }
  })
});
router.get('/logout', (req, res) => {
  req.session.user = null
  req.session.loggedIn = false
  res.redirect('/')
});
router.get('/cart', verifyLogin, async (req, res) => {
  //console.log(req.session.user._id);
  let products = await userHelpers.getCartProducts(req.session.user._id,)
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let user = req.session.user
  res.render('user/cart', { products, user, total, admin: false })
});
router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  //console.log("api call");
  //console.log(req.params.id);
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})
router.post('/change-product-quantity', (req, res, next) => {
  //console.log(req.body);
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})
router.post('/remove-from-cart', (req, res) => {
  // console.log(req.body);
  userHelpers.removeFromCart(req.body).then((response) => {
    res.json(response)
  })
})
router.get('/place-order', verifyLogin, async (req, res) => {
  // console.log(req.session.user);
  await userHelpers.getTotalAmount(req.session.user._id).then((total) => {
    res.render('user/place-order', { total, user: req.session.user })
  })
})
router.post('/place-order', async (req, res) => {
  var mobile = req.body.mobile
  let user = await userHelpers.getUserData(req.session.user._id)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  if (req.body['payment-method'] === 'COD') {
    await userHelpers.placeOrder(req.body, products, totalPrice)
    res.json({ codSuccess: true })
  } else {
    let data = req.body
    await userHelpers.generateRaszorpay(totalPrice).then(async(response) => {
      await userHelpers.placeOrder(req.body, products, totalPrice)
      response = {
        id: response.id,
        entity: response.entity,
        amount: response.amount,
        amount_paid: response.amount_paid,
        amount_due: response.amount_due,
        currency: response.currency,
        receipt: response.receipt,
        offer_id: response.offer_id,
        status: response.status,
        attempts: response.attempts,
        notes: response.notes,
        created_at: response.created_at,
        mobile: mobile,
        name: user.name,
        email: user.email
      }
      res.json(response)
    })
  }
})
router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders', { user: req.session.user, orders, admin: false })
})
router.get('/order-success', verifyLogin, (req, res) => {
  res.render('user/order-success', { admin: false, user: req.session.user })
})
router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  var order = orders[0]
  res.render('user/view-order-products', { user: req.session.user, products, order, admin: false })
})
router.post('/verify-payment', async (req, res) => {
  // console.log(req.body);
  userHelpers.confirmPayment(req.body).then((data) => {
    if (data.status) {
      // console.log("yes");
      var response = { status: true }
      res.json(response)
    } else {
      // console.log("No");
      var response = { status: false }
      res.json(response)
    }
  })
})
router.get('/payment-failed',async(req,res)=>{
  res.render('user/order-failed')
})

module.exports = router;
