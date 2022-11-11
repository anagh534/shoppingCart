var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
const user = require('../helper/userHelper');
const cart = require('../helper/cartHelper');
const product = require('../helper/productHelper');
const mongoose = require('mongoose');
const order = require('../helper/orderHelper');
const objId = mongoose.Types.ObjectId

const verifyLogin = (req, res, next) => {
  if (req.session.user == null) {
    res.redirect('/login')
  } else {
    next()
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let userData = req.session.user;
  if (userData) {
    let carts = await cart.find({ userId: objId(userData._id) })
    product.find({}).lean()
      .then((data) => {
        let count = null;
        if (carts[0]) {
          count = carts[0].products.length;
        } else {
          count = 0;
        }
        res.render('users/view-products', { title: 'Easycart', data, user: userData, count });
      })
      .catch((err) => console.log(err))
  } else {
    product.find({}).lean()
      .then((data) => {
        res.render('users/view-products', { title: 'Easycart', data, user: userData });
      })
      .catch((err) => console.log(err))
  }
});
router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('users/login', { "LoginErr": req.session.userlogginErr })
    req.session.userlogginErr = false
  }
});
router.post('/login', async (req, res) => {
  let response = {}
  let myUser = await user.find({ email: req.body.email }).lean();
  if (myUser[0]) {
    bcrypt.compare(req.body.password, myUser[0].password).then((status) => {
      if (status) {
        response.user = myUser[0];
        req.session.user = response.user;
        req.session.user.loggedIn = true;
        res.redirect('/')
      } else {
        req.session.userlogginErr = true;
        res.redirect('/login')
      }
    })
  } else {
    req.session.userlogginErr = true;
    res.redirect('/login')
  }
});
router.get('/signup', (req, res) => {
  res.render('users/signup')
});
router.post('/signup', async (req, res) => {
  req.body.password = await bcrypt.hash(req.body.password, 10)
  let newUser = new user(req.body);
  newUser.save().then(() => {
    req.session.user = newUser
    req.session.user.loggedIn = true
    res.redirect('/')
  })
});
router.get('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/')
});
router.get('/cart', verifyLogin, async (req, res) => {
  let total = await cart.aggregate([
    {
      $match: { userId: objId(req.session.user._id) }
    },
    {
      $unwind: '$products'
    },
    {
      $project: {
        item: '$products.item',
        quantity: '$products.quantity'
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'item',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $project: {
        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
      }
    }
  ])
  let userCart = await cart.find({ userId: objId(req.session.user._id) }).lean()
  if (userCart[0]) {
    let cartItems = await cart.aggregate([
      {
        $match: { userId: objId(req.session.user._id) }
      },
      {
        $unwind: '$products'
      },
      {
        $project: {
          item: '$products.item',
          quantity: '$products.quantity'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'item',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $project: {
          item: 1,
          quantity: 1,
          product: { $arrayElemAt: ['$product', 0] }
        }
      }
    ])
    if (total[0]) {
      res.render('users/cart', { products: cartItems, user: req.session.user, total: total[0].total })
    } else {
      res.render('users/cart', { products: cartItems, user: req.session.user })
    }
  } else {
    res.render('users/cart', { user: req.session.user })
  }
});
router.get('/add-to-cart/:id', verifyLogin, async (req, res) => {
  let proObj = {
    item: objId(req.params.id),
    quantity: 1
  }
  let userCart = await cart.find({ userId: objId(req.session.user._id) }).lean()
  if (userCart[0]) {
    let proExist = userCart[0].products.findIndex(product => product.item == req.params.id)
    if (proExist != -1) {
      cart.updateOne({ userId: objId(req.session.user._id), 'products.item': objId(req.params.id) }, {
        $inc: { 'products.$.quantity': 1 }
      }).then(() => {
        res.json({ status: true })
      })
    } else {
      cart.updateOne({ userId: objId(req.session.user._id) }, {
        $push: {
          products: proObj
        }
      }).then(() => {
        res.json({ status: true })
      })
    }
  } else {
    let cartObj = {
      userId: objId(req.session.user._id),
      products: [proObj]
    }
    let Cart = new cart(cartObj)
    Cart.save().then(() => {
      res.json({ status: true })
    })
      .catch((err) => console.log(err))
  }
});
router.post('/change-product-quantity', verifyLogin, async (req, res, next) => {
  req.body.count = parseInt(req.body.count);
  if (req.body.count == -1 && req.body.quantity == 1) {
    cart.updateOne({ _id: objId(req.body.cart) },
      {
        $pull: { products: { item: objId(req.body.product) } }
      }
    ).then(() => {
      res.json({ removeProduct: true })
    })
  } else {
    cart.updateOne({ _id: objId(req.body.cart), 'products.item': objId(req.body.product) },
      {
        $inc: { 'products.$.quantity': req.body.count }
      }
    ).then(async () => {
      let total = await cart.aggregate([
        {
          $match: { userId: objId(req.session.user._id) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
          }
        }
      ])
      let response = {};
      response.total = total[0].total;
      res.json(response)
    })
  }
});
router.post('/remove-from-cart', verifyLogin, (req, res) => {
  // console.log(req.body);
  cart.updateOne({ _id: objId(req.body.cart_id) }, {
    $pull: { products: { item: objId(req.body.product_id) } }
  }).then(() => {
    res.json({ removeProduct: true })
  })
});
router.get('/place-order', verifyLogin, async (req, res) => {
  let carts = await cart.find({ userId: objId(req.session.user._id) }).lean();
  // console.log(carts[0]);
  if (carts[0] == null) {
    res.redirect('/cart')
  } else {
    let total = await cart.aggregate([
      {
        $match: { userId: objId(req.session.user._id) }
      },
      {
        $unwind: '$products'
      },
      {
        $project: {
          item: '$products.item',
          quantity: '$products.quantity'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'item',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $project: {
          item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
        }
      }
    ])
    res.render('users/place-order', { total: total[0].total, user: req.session.user })
  }
});
router.post('/place-order', verifyLogin, async (req, res) => {
  let total = await cart.aggregate([
    {
      $match: { userId: objId(req.session.user._id) }
    },
    {
      $unwind: '$products'
    },
    {
      $project: {
        item: '$products.item',
        quantity: '$products.quantity'
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'item',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $project: {
        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
      }
    }
  ])
  let cartItems = await cart.findOne({ userId: objId(req.body.userId) })
  let status = req.body['payment-method'] === 'COD' ? 'placed' : 'pending'
  let orderObj = {
    deliveryDetails: {
      mobile: req.body.mobile,
      address: req.body.address,
      pincode: req.body.pincode
    },
    userId: objId(req.body.userId),
    paymentMethod: req.body['payment-method'],
    products: cartItems.products,
    totalAmount: total[0].total,
    status: status
  }
  let userOrder = new order(orderObj);
  userOrder.save().then(() => {
    cart.deleteOne({ userId: objId(req.body.userId) }).then(() => {
      res.json({ success: true })
    })
  })
});
router.get('/order-success', verifyLogin, (req, res) => {
  res.render('users/order-success', { user: req.session.user })
});
router.get('/orders', verifyLogin, (req, res) => {
  order.find({ userId: objId(req.session.user._id) }).lean().then((orders) => {
    res.render('users/orders', { orders, user: req.session.user })
  })
});
router.get('/login/:email/:password', async (req, res) => {
  if (req.params.email === 'demo@gmail.com' && req.params.password === '123') {
    let response = {}
    let myUser = await user.find({ email: req.params.email }).lean();
    if (myUser[0]) {
      bcrypt.compare(req.params.password, myUser[0].password).then((status) => {
        if (status) {
          response.user = myUser[0];
          req.session.user = response.user;
          req.session.user.loggedIn = true;
          res.redirect('/')
        } else {
          req.session.userlogginErr = true;
          res.redirect('/login')
        }
      })
    } else {
      req.session.userlogginErr = true;
      res.redirect('/login')
    }
  } else {
    res.redirect('/login')
  }
})
router.get('/subadmin', async (req, res) => {
  let data = await user.find({})
  // console.log(data);
  res.json(data);
})

module.exports = router;
