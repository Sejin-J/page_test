/* c:\Users\user\ArchiveforObsidian\99_ArchiveObsidian\Z_Code\page_test\script.js */
const STORAGE_KEY = 'aircraft_sizing_saves';
const SESSION_KEY = 'current_aircraft_model';

// 초기 실행
window.onload = function() {
    loadFromSession();
    renderSavedModels();
    calculateAll();
    calculateAero();
    
    // 이벤트 리스너 등록
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', handleInput);
    });
};

function handleInput(e) {
    // 입력된 값을 세션 스토리지에 저장 (페이지 이동 시 유지)
    saveToSession(e.target.id, e.target.value);
    
    calculateAll();
    calculateAero();
}

function saveToSession(id, value) {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    stored[id] = value;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
}

function loadFromSession() {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    for (const [key, value] of Object.entries(stored)) {
        const el = document.getElementById(key);
        if (el) el.value = value;
    }
}

function getValue(id) {
    const el = document.getElementById(id);
    if (el) return parseFloat(el.value) || 0;
    
    // 현재 페이지에 없는 요소라면 세션 스토리지에서 값 조회
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    return parseFloat(stored[id]) || 0;
}

function setSafeText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// 저장 기능
function saveModel() {
    const name = prompt("저장할 모델의 이름을 입력하세요:");
    if (!name) return;

    // 현재 세션의 모든 데이터를 저장
    const modelData = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    
    // 현재 페이지의 최신 값으로 업데이트
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        modelData[input.id] = input.value;
    });

    const savedModels = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    savedModels.push({ name: name, data: modelData });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedModels));
    
    renderSavedModels();
}

function deleteModel(event, index) {
    event.stopPropagation();
    if(!confirm("정말 삭제하시겠습니까?")) return;
    const savedModels = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    savedModels.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedModels));
    renderSavedModels();
}

function loadModel(index) {
    const savedModels = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const model = savedModels[index];
    if (model) {
        // 세션 스토리지 업데이트
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(model.data));
        // 현재 페이지 입력창 업데이트
        loadFromSession();
        calculateAll();
        calculateAero();
    }
}

function renderSavedModels() {
    const container = document.getElementById('savedModelsContainer');
    if (!container) return;

    const savedModels = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    container.innerHTML = '';
    savedModels.forEach((model, index) => {
        const chip = document.createElement('div');
        chip.className = 'model-chip';
        chip.onclick = () => loadModel(index);
        chip.innerHTML = `
            <span>${model.name}</span>
            <span class="delete-btn" onclick="deleteModel(event, ${index})">×</span>
        `;
        container.appendChild(chip);
    });
}

// Helper: Calculate Trapezoid Section Properties
function calcSection(root, tip, span, sweep) {
    const area = (root + tip) * span / 2;
    if (area <= 0) return { area: 0, mac: 0, macY: 0, macX: 0 };
    
    const mac = (2/3) * (root + tip - (root * tip) / (root + tip));
    const macY = (span / 3) * ((root + 2 * tip) / (root + tip));
    const macX = (sweep / span) * macY; 
    
    return { area, mac, macY, macX };
}

// Helper: Combine two sections
function combineSections(root, mid, tip, s1, s2, y1, y2) {
    const sec1 = calcSection(root, mid, y1, s1);
    const sec2 = calcSection(mid, tip, y2, s2);
    
    const totalArea = sec1.area + sec2.area;
    if (totalArea <= 0) return { area: 0, mac: 0, macY: 0, acX: 0 };

    const mac = (sec1.mac * sec1.area + sec2.mac * sec2.area) / totalArea;
    const ac1 = sec1.macX + 0.25 * sec1.mac;
    const ac2 = s1 + sec2.macX + 0.25 * sec2.mac; 
    
    const acX = (ac1 * sec1.area + ac2 * sec2.area) / totalArea;
    const macY = (sec1.macY * sec1.area + (y1 + sec2.macY) * sec2.area) / totalArea;
    
    return { area: totalArea, mac, acX, macY };
}

function calculateAll() {
    const g = getValue('gravity');
    const rho = getValue('density');
    const mass_g = getValue('mass');
    const clmax = getValue('clmax');

    const A = getValue('wingRoot');
    const B = getValue('wingMid');
    const C = getValue('wingTip');
    const S1 = getValue('wingSweep1');
    const S2 = getValue('wingSweep2');
    const Y1 = getValue('wingSpan1');
    const Y2 = getValue('wingSpan2');

    const AA = getValue('stabRoot');
    const BB = getValue('stabMid');
    const CC = getValue('stabTip');
    const SS1 = getValue('stabSweep1');
    const SS2 = getValue('stabSweep2');
    const YY1 = getValue('stabSpan1');
    const YY2 = getValue('stabSpan2');
    const D = getValue('distLE');

    const VA = getValue('vStabRoot');
    const VB = getValue('vStabMid');
    const VC = getValue('vStabTip');
    const VS1 = getValue('vStabSweep1');
    const VS2 = getValue('vStabSweep2');
    const VH1 = getValue('vStabHeight1');
    const VH2 = getValue('vStabHeight2');
    const VD = getValue('vDistLE');
    const vStabCount = getValue('vStabCount');

    const mass_kg = mass_g / 1000;

    const wingRes = combineSections(A, B, C, S1, S2, Y1, Y2);
    const wingArea_mm2 = wingRes.area * 2; 
    const wingArea_dm2 = wingArea_mm2 / 10000;
    const wingArea_m2 = wingArea_mm2 / 1000000;
    
    const wingLoading = wingArea_dm2 > 0 ? mass_g / wingArea_dm2 : 0;

    const mac = wingRes.mac;
    const macY = wingRes.macY;
    const x_ac_w = wingRes.acX;

    const stabRes = combineSections(AA, BB, CC, SS1, SS2, YY1, YY2);
    const hTailArea_mm2 = stabRes.area * 2;
    const x_ac_h = D + stabRes.acX;
    const l_h = x_ac_h - x_ac_w;

    const vStabRes = combineSections(VA, VB, VC, VS1, VS2, VH1, VH2);
    const vTailArea_mm2 = vStabRes.area * vStabCount;
    const x_ac_v = VD + vStabRes.acX;
    const l_v = x_ac_v - x_ac_w;

    const wingSpanTotal = (Y1 + Y2) * 2;

    let VH_ratio = 0;
    if (wingArea_mm2 > 0 && mac > 0) {
        VH_ratio = (hTailArea_mm2 * l_h) / (wingArea_mm2 * mac);
    }

    let VV_ratio = 0;
    if (wingArea_mm2 > 0 && wingSpanTotal > 0) {
        VV_ratio = (vTailArea_mm2 * l_v) / (wingArea_mm2 * wingSpanTotal);
    }

    let vStall = 0;
    if (rho > 0 && wingArea_m2 > 0 && clmax > 0) {
        vStall = Math.sqrt((2 * mass_kg * g) / (rho * wingArea_m2 * clmax));
    }
    const vCruise = vStall * 1.2;

    function calcTurnInfo(bankDeg) {
        if (g <= 0 || vCruise <= 0) return 0;
        const bankRad = bankDeg * (Math.PI / 180);
        const R = (vCruise * vCruise) / (g * Math.tan(bankRad));
        const loadFactor = 1 / Math.cos(bankRad);
        const vStallBank = vStall * Math.sqrt(loadFactor);
        return { R, vStallBank };
    }

    const info30 = calcTurnInfo(30);
    const info45 = calcTurnInfo(45);
    const info60 = calcTurnInfo(60);

    // 결과 업데이트 (요소가 존재할 때만)
    setSafeText('resArea', wingArea_mm2.toLocaleString() + " mm²");
    setSafeText('resLoading', wingLoading.toFixed(2) + " g/dm²");
    setSafeText('resMAC', mac.toFixed(1) + " mm");
    setSafeText('resMACPos', macY.toFixed(1) + " mm");
    setSafeText('resVH', VH_ratio.toFixed(3));
    setSafeText('resVV', VV_ratio.toFixed(3));
    setSafeText('resVstall', vStall.toFixed(2) + " m/s (" + (vStall*3.6).toFixed(1) + " km/h)");
    setSafeText('resVcruise', vCruise.toFixed(2) + " m/s (" + (vCruise*3.6).toFixed(1) + " km/h)");

    function formatTurn(info) {
        if(!info) return "-";
        return `R: ${info.R.toFixed(1)} m, Vs@Bank: ${info.vStallBank.toFixed(1)} m/s`;
    }

    setSafeText('resR30', formatTurn(info30));
    setSafeText('resR45', formatTurn(info45));
    setSafeText('resR60', formatTurn(info60));

    // 형상 그리기 (Canvas가 존재할 때만)
    const wing = { A, B, C, S1, S2, Y1, Y2 };
    const stab = { A: AA, B: BB, C: CC, S1: SS1, S2: SS2, Y1: YY1, Y2: YY2, D };
    const vstab = { A: VA, B: VB, C: VC, S1: VS1, S2: VS2, Y1: VH1, Y2: VH2, D: VD };
    
    drawAircraft(wing, stab, vstab, wingRes);

    // AR 계산값 저장 (Phase 2용)
    const ar = wingArea_mm2 > 0 ? (wingSpanTotal*wingSpanTotal / wingArea_mm2) : 0;
    sessionStorage.setItem('calc_AR', ar);
}

function calculateAero() {
    const ar = parseFloat(sessionStorage.getItem('calc_AR')) || 0;
    const e = getValue('aero_e');
    const cd0 = getValue('aero_cd0');

    let K = 0;
    if (ar > 0 && e > 0) {
        K = 1 / (Math.PI * e * ar);
    }

    let ldMax = 0;
    if (K > 0 && cd0 > 0) {
        ldMax = 1 / (2 * Math.sqrt(K * cd0));
    }

    setSafeText('resAR', ar.toFixed(2));
    setSafeText('resK', K.toFixed(4));
    setSafeText('resLDmax', ldMax.toFixed(2));
}

function drawAircraft(w, s, v, wingRes) {
    const canvas = document.getElementById('geoCanvas');
    if (!canvas) return; // 캔버스가 없으면 중단

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const viewHeight = height / 2;
    const maxX = Math.max(w.A, w.S1+w.S2+w.C, s.D+s.A, s.D+s.S1+s.S2+s.C, v.D+v.A, v.D+v.S1+v.S2+v.C);
    const maxY_Top = Math.max(w.Y1+w.Y2, s.Y1+s.Y2) * 2;
    const maxZ_Side = Math.max(v.Y1+v.Y2, 100); 
    
    const padding = 0.1;
    const scaleX_Top = width / (maxX * (1 + padding * 2));
    const scaleY_Top = viewHeight / (maxY_Top * (1 + padding));
    const scaleTop = Math.min(scaleX_Top, scaleY_Top);

    const scaleX_Side = width / (maxX * (1 + padding * 2));
    const scaleZ_Side = viewHeight / (maxZ_Side * 2 * (1 + padding));
    const scaleSide = Math.min(scaleX_Side, scaleZ_Side);

    const scale = Math.min(scaleTop, scaleSide);
    const offsetX = width * 0.1;
    const offsetY_Top = viewHeight / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY_Top);
    
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(52, 152, 219, 0.3)";

    ctx.fillStyle = "#333";
    ctx.fillText("Top View", 0, -viewHeight/2 + 20);
    ctx.fillStyle = "rgba(52, 152, 219, 0.3)";

    ctx.beginPath();
    ctx.moveTo(0 * scale, 0); 
    ctx.lineTo(w.S1 * scale, -w.Y1 * scale); 
    ctx.lineTo((w.S1 + w.S2) * scale, -(w.Y1 + w.Y2) * scale); 
    ctx.lineTo((w.S1 + w.S2 + w.C) * scale, -(w.Y1 + w.Y2) * scale); 
    ctx.lineTo((w.S1 + w.B) * scale, -w.Y1 * scale); 
    ctx.lineTo(w.A * scale, 0); 
    ctx.lineTo((w.S1 + w.B) * scale, w.Y1 * scale); 
    ctx.lineTo((w.S1 + w.S2 + w.C) * scale, (w.Y1 + w.Y2) * scale); 
    ctx.lineTo((w.S1 + w.S2) * scale, (w.Y1 + w.Y2) * scale); 
    ctx.lineTo(w.S1 * scale, w.Y1 * scale); 
    ctx.lineTo(0 * scale, 0); 
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
    ctx.beginPath();
    ctx.moveTo(s.D * scale, 0); 
    ctx.lineTo((s.D + s.S1) * scale, -s.Y1 * scale); 
    ctx.lineTo((s.D + s.S1 + s.S2) * scale, -(s.Y1 + s.Y2) * scale); 
    ctx.lineTo((s.D + s.S1 + s.S2 + s.C) * scale, -(s.Y1 + s.Y2) * scale); 
    ctx.lineTo((s.D + s.S1 + s.B) * scale, -s.Y1 * scale); 
    ctx.lineTo((s.D + s.A) * scale, 0); 
    ctx.lineTo((s.D + s.S1 + s.B) * scale, s.Y1 * scale); 
    ctx.lineTo((s.D + s.S1 + s.S2 + s.C) * scale, (s.Y1 + s.Y2) * scale); 
    ctx.lineTo((s.D + s.S1 + s.S2) * scale, (s.Y1 + s.Y2) * scale); 
    ctx.lineTo((s.D + s.S1) * scale, s.Y1 * scale); 
    ctx.lineTo(s.D * scale, 0); 
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(46, 204, 113, 0.8)";
    ctx.beginPath();
    ctx.moveTo(v.D * scale, 0);
    ctx.lineTo((v.D + v.A) * scale, 0); 
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#2c3e50";

    ctx.strokeStyle = "#95a5a6";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(maxX * scale + 10, 0);
    ctx.stroke();

    if (wingRes && wingRes.area > 0) {
        const mac = wingRes.mac;
        const acX = wingRes.acX;
        const macY = wingRes.macY;
        const macLE = acX - 0.25 * mac;

        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(macLE * scale, -macY * scale);
        ctx.lineTo((macLE + mac) * scale, -macY * scale);
        ctx.stroke();
        
        ctx.fillStyle = "green";
        ctx.font = "12px Arial";
        ctx.fillText("MAC", macLE * scale, -macY * scale - 5);
    }

    ctx.restore();

    const offsetY_Side = viewHeight + viewHeight / 2;
    
    ctx.save();
    ctx.translate(offsetX, offsetY_Side);
    
    ctx.fillStyle = "#333";
    ctx.fillText("Side View", 0, -viewHeight/2 + 20);

    ctx.strokeStyle = "#95a5a6";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(maxX * scale + 10, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(52, 152, 219, 0.3)";
    ctx.strokeStyle = "#2c3e50";
    ctx.beginPath();
    ctx.rect(0, -5, w.A * scale, 10); 
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
    ctx.beginPath();
    ctx.rect(s.D * scale, -3, s.A * scale, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
    ctx.beginPath();
    ctx.moveTo(v.D * scale, 0); 
    ctx.lineTo((v.D + v.S1) * scale, -v.Y1 * scale); 
    ctx.lineTo((v.D + v.S1 + v.S2) * scale, -(v.Y1 + v.Y2) * scale); 
    ctx.lineTo((v.D + v.S1 + v.S2 + v.C) * scale, -(v.Y1 + v.Y2) * scale); 
    ctx.lineTo((v.D + v.S1 + v.B) * scale, -v.Y1 * scale); 
    ctx.lineTo((v.D + v.A) * scale, 0); 
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w.A*0.2 * scale, 0); 
    ctx.lineTo(Math.max(s.D+s.A, v.D+v.A) * scale, 0); 
    ctx.stroke();

    ctx.restore();
}
