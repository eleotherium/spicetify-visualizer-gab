// src/types/spicetify-augment.d.ts

// Extensões de tipos para o ambiente Spicetify
declare namespace Spicetify {
  interface Player {
    /**
     * Retorna dados de áudio FFT em tempo real (se suportado pelo Spicetify).
     */
    getAudioData?: () => {
      fft: number[];
      volume?: number;
    };
  }

  namespace ReactComponent {
    /**
     * Submenu usado em menus contextuais (não tipado oficialmente).
     */
    const MenuSubMenuItem: any;
  }

  /**
   * Permite chamadas Cosmos (API interna do Spotify).
   */
  const CosmosAsync: {
    get: (url: string) => Promise<any>;
    post: (url: string, body?: any) => Promise<any>;
  };

  /**
   * Mostra uma notificação visual no Spotify.
   */
  function showNotification(message: string): void;
}
