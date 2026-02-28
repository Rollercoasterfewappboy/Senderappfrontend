import { createContext, useState, useContext, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('marketbook_cart')
      if (savedCart) {
        setCartItems(JSON.parse(savedCart))
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
      setCartItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('marketbook_cart', JSON.stringify(cartItems))
      console.log('[Cart] Cart updated:', { itemCount: cartItems.length, items: cartItems })
    }
  }, [cartItems, isLoading])

  // Add item to cart
  const addToCart = (product) => {
    setCartItems((prevItems) => {
      // Check if product already in cart
      const existingItem = prevItems.find(item => item._id === product._id)

      if (existingItem) {
        // Increase quantity if already exists
        const updated = prevItems.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        const newQuantity = existingItem.quantity + 1
        console.log('[Cart] Product added (quantity increment):', { productName: product.name, newQuantity })
        return updated
      } else {
        // Add new item with quantity 1
        const newItem = {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          image: product.image,
          websiteId: product.websiteId,
          quantity: 1
        }
        const updated = [ ...prevItems, newItem ]
        console.log('[Cart] Product added:', { productName: product.name, newQuantity: 1 })
        return updated
      }
    })
  }

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCartItems((prevItems) => {
      const updatedCart = prevItems.filter(item => item._id !== productId)
      console.log('[Cart] Product removed:', { productId, remainingItems: updatedCart.length })
      return updatedCart
    })
  }

  // Update quantity
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems((prevItems) => {
      const updated = prevItems.map(item =>
        item._id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
      const item = updated.find(i => i._id === productId)
      console.log('[Cart] Quantity updated:', { productName: item?.name, newQuantity: Math.max(1, quantity) })
      return updated
    })
  }

  // Clear cart
  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('marketbook_cart')
    console.log('[Cart] Cart cleared')
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = 0 // Can be configured later
  const total = subtotal + tax

  // Get cart statistics
  const itemCount = cartItems.length
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const value = {
    // State
    cartItems,
    isLoading,
    itemCount,
    totalQuantity,
    subtotal,
    tax,
    total,

    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Hook to use cart context
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
