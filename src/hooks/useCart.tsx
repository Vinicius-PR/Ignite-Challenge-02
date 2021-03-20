import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      
      const productExistInCart = cart.find(product => product.id === productId);  

      if (!productExistInCart) {
        const { data: product } = await api.get<Product>(`products/${productId}`);
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...product, amount: 1 }]));
          toast.success('Adicionado');
          return;
        }
      }

      if (productExistInCart) {
        const { data: stock } = await api.get(`stock/${productId}`)

        if (stock.amount > productExistInCart.amount) {
          const newCart = cart.map(item => item.id === productId ? {
            ...item,
            amount: Number(item.amount) + 1
          } : item)

          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          toast.success('Adicionado');
          return;
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExistInCart = cart.find(product => product.id === productId);
      if (!productExistInCart) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter(element =>  element.id !== productId );
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1)
        return;

      const productResponse = await api.get(`/stock/${productId}`);
      const productAmount = productResponse.data.amount
      const ifStockAvailable = amount <= productAmount;


      if (!ifStockAvailable) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(item => item.id === productId ? {
        ...item,
        amount: amount
      } : item)
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
