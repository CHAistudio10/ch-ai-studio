const STORAGE_KEY = 'ch_ai_studio_tiktok_go_projects_v3';

export class RestaurantProjectManager {
  constructor() {
    this.projects = this.loadProjects();
    this.activeProjectId = null;
  }

  loadProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveProjects() {
    try {
      const serializable = {};
      for (const [id, proj] of Object.entries(this.projects)) {
        serializable[id] = {
          ...proj,
          photos: proj.photos.map(p => ({
            id: p.id,
            name: p.name,
            order: p.order,
            dataUrl: p.dataUrl
          }))
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('[TikTok Go] Penyimpanan penuh, menyimpan di sesi memori.');
    }
  }

  createNewProject(customName = '') {
    const count = Object.keys(this.projects).length + 1;
    const defaultLabel = customName.trim() || `Proyek Kuliner #${count}`;
    const id = `resto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newProject = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      restaurantData: {
        name: customName.trim() || '',
        displayLabel: defaultLabel,
        menuName: '',
        location: '',
        normalPrice: '',
        promoPrice: '',
        promoInfo: '',
        highlights: '',
        tiktokLocationTag: '',
        tiktokPromoTag: ''
      },
      promptInstruction: 'Buat storytelling promosi restoran yang unik, lucu, bikin penasaran, dan membuat orang ingin datang.',
      photos: [],
      audioConfig: {
        fileName: null,
        startTime: 0,
        duration: 20,
        beatTimestamps: []
      },
      generatedContent: {
        scenes: [],
        caption: '',
        hashtags: ''
      },
      renderStatus: {
        progress: 0,
        completed: false,
        videoUrl: null
      }
    };

    this.projects[id] = newProject;
    this.activeProjectId = id;
    this.saveProjects();
    return newProject;
  }

  getActiveProject() {
    if (!this.activeProjectId || !this.projects[this.activeProjectId]) {
      const ids = Object.keys(this.projects);
      if (ids.length > 0) {
        this.activeProjectId = ids[0];
      } else {
        return this.createNewProject();
      }
    }
    return this.projects[this.activeProjectId];
  }

  switchProject(projectId) {
    if (this.projects[projectId]) {
      this.activeProjectId = projectId;
      return this.projects[projectId];
    }
    return null;
  }

  updateRestaurantData(data) {
    const proj = this.getActiveProject();
    proj.restaurantData = { ...proj.restaurantData, ...data };
    if (data.name !== undefined && data.name.trim()) {
      proj.restaurantData.displayLabel = data.name.trim();
    }
    proj.updatedAt = new Date().toISOString();
    this.saveProjects();
    return proj;
  }
}
