var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { ObjectID, ObjectId } = require('mongodb')
const { response } = require('express')
var objectId = require('mongodb').ObjectID
const Razorpay = require('razorpay')
const uniqId = require('generate-unique-id')
const { use } = require('../routes/users')
const crypto = require("crypto");
var instance = new Razorpay({
    key_id: 'rzp_test_skykilpdJoihjs',
    key_secret: 'eeEiMmvDmlfUqcRaJ98EzgCS',
});

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.mobile = parseInt(userData.mobile)
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.ops[0])
                //console.log(data.ops[0]);
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        // console.log('login success');
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        // console.log('login failed');
                        resolve({ status: false })
                    }
                })
            } else {
                // console.log('Login faild');
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        return new Promise(async (resolve, reject) => {
            let proObj = {
                item: ObjectId(proId),
                user: objectId(userId),
                quantity: 1
            }
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectID(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                // console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) }, {
                            $push: { products: proObj }
                        }).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
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
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            // console.log(cartItems);
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            // console.log(userId);
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        // console.log(details.quantity);

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }
                ).then((response) => {
                    resolve({ status: true })
                })
            }
        })
    },
    removeFromCart: (userData) => {
        return new Promise((resolve, reject) => {
            console.log(userData);
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(userData.cart_id) },
                {
                    $pull: { products: { item: objectId(userData.product_id) } }
                }
            ).then((response) => {
                resolve({ removeProduct: true })
            })
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
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
                        from: collection.PRODUCT_COLLECTION,
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
            ]).toArray()
            resolve(total[0].total)
        })
    },
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === 'COD' ? 'Ordered' : 'Pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: parseInt(order.mobile),
                    address: order.adress,
                    pincode: order.pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).removeOne({ user: objectId(order.userId) })
                resolve(response.ops[0]._id)
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            // console.log(cart);
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: objectId(userId) }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
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
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            // console.log(orderItems);
            resolve(orderItems)
        })
    },
    generateRaszorpay: (totalPrice) => {
        return new Promise((resolve, reject) => {
            totalPrice = parseInt(totalPrice * 100)
            var options = {
                amount: totalPrice,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "easy_cart"
            };
            instance.orders.create(options, function (err, order) {
                console.log(err);
                resolve(order)
            });

        })
    },
    getUserData: (userId) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            user = {
                _id: user._id,
                name: user.Name,
                email: user.Email
            }
            resolve(user)
        })
    },
    confirmPayment: (data) => {
        return new Promise(async (resolve, reject) => {
            var payment = {
                payment_id: data.payment_id,
                order_id: data.order_id,
                signature: data.signature
            }
            // console.log(payment);
            const hmac = crypto.createHmac('sha256', "eeEiMmvDmlfUqcRaJ98EzgCS");

            hmac.update(payment.order_id + "|" + payment.payment_id);
            let generatedSignature = hmac.digest('hex');

            let isSignatureValid = generatedSignature == payment.signature;
            // console.log(isSignatureValid);
            if(isSignatureValid){
                resolve({status:true})
            }else{
                resolve({status:false})
            }
        })
    }
}