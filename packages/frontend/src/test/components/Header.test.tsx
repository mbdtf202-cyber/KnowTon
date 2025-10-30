import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../../components/Header';
import { BrowserRouter } from 'react-router-dom';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    isLoading: false,
  }),
}));

// Mock the LanguageSwitcher component
vi.mock('../../components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Language Switcher</div>,
}));

const HeaderWithRouter = () => (
  <BrowserRouter>
    <Header />
  </BrowserRouter>
);

describe('Header', () => {
  it('renders the KnowTon logo', () => {
    render(<HeaderWithRouter />);
    
    const logo = screen.getByText('KnowTon');
    expect(logo).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<HeaderWithRouter />);
    
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders connect wallet button when not connected', () => {
    render(<HeaderWithRouter />);
    
    const connectButton = screen.getByText('Connect Wallet');
    expect(connectButton).toBeInTheDocument();
  });

  it('renders language switcher', () => {
    render(<HeaderWithRouter />);
    
    const languageSwitcher = screen.getByTestId('language-switcher');
    expect(languageSwitcher).toBeInTheDocument();
  });

  it('handles mobile menu toggle', () => {
    render(<HeaderWithRouter />);
    
    // Find mobile menu button (hamburger)
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
    expect(mobileMenuButton).toBeInTheDocument();
    
    // Click to open mobile menu
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should be visible
    const mobileMenu = screen.getByTestId('mobile-menu');
    expect(mobileMenu).toBeInTheDocument();
  });

  it('navigates to correct routes when links are clicked', () => {
    render(<HeaderWithRouter />);
    
    const marketplaceLink = screen.getByText('Marketplace');
    expect(marketplaceLink.closest('a')).toHaveAttribute('href', '/marketplace');
    
    const createLink = screen.getByText('Create');
    expect(createLink.closest('a')).toHaveAttribute('href', '/upload');
    
    const analyticsLink = screen.getByText('Analytics');
    expect(analyticsLink.closest('a')).toHaveAttribute('href', '/analytics');
  });
});