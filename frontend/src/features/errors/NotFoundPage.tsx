import { routes } from '../../configuration/routes';
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, Search } from 'lucide-react';
import { Button } from '../../design-system/primitives/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-3xl font-black text-stone-900">Page introuvable</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to={routes.home()}>
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Retour à l'accueil
          </Button>
        </Link>
        <Link to={routes.search()}>
          <Button variant="outline" leftIcon={<Search className="w-4 h-4" />}>
            Rechercher une annonce
          </Button>
        </Link>
      </div>
    </div>
  );
};
