'use client';

import { useCallback, useState } from 'react';
import type { TrainingScope, TrainingScopeContext, TrainingScopeSelection } from '@/types/portal/entrenamientos.types';

export function useEntrenamientoScope() {
  const [selection, setSelection] = useState<TrainingScopeSelection>({
    open: false,
    context: null,
  });

  const openScopeModal = useCallback((context: TrainingScopeContext) => {
    setSelection({ open: true, context });
  }, []);

  const closeScopeModal = useCallback(() => {
    setSelection({ open: false, context: null });
  }, []);

  const resolveScope = useCallback(
    (scope: TrainingScope) => {
      const currentContext = selection.context;
      if (currentContext && !currentContext.allowedScopes.includes(scope)) {
        closeScopeModal();
        return {
          scope,
          context: null,
        };
      }

      closeScopeModal();
      return {
        scope,
        context: currentContext,
      };
    },
    [closeScopeModal, selection.context],
  );

  return {
    scopeSelection: selection,
    openScopeModal,
    closeScopeModal,
    resolveScope,
  };
}
