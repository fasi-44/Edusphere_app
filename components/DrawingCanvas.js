import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

const COLORS = [
    { value: "#000000", label: "Black" },
    { value: "#DC2626", label: "Red" },
    { value: "#2563EB", label: "Blue" },
    { value: "#16A34A", label: "Green" },
    { value: "#EA580C", label: "Orange" },
    { value: "#7C3AED", label: "Purple" },
];

const BRUSH_SIZES = [
    { value: 2, label: "S" },
    { value: 4, label: "M" },
    { value: 8, label: "L" },
];

export default function DrawingCanvas({ onDrawingChange, height = 300 }) {
    const signatureRef = useRef(null);
    const [penColor, setPenColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(4);
    const [isEraser, setIsEraser] = useState(false);

    const handleEnd = () => {
        signatureRef.current?.readSignature();
    };

    const handleOK = (signature) => {
        if (signature && onDrawingChange) {
            onDrawingChange(signature);
        }
    };

    const handleEmpty = () => {
        onDrawingChange?.(null);
    };

    const handleClear = () => {
        signatureRef.current?.clearSignature();
        onDrawingChange?.(null);
    };

    const handleUndo = () => {
        signatureRef.current?.undo();
        // Read updated signature after undo — onEmpty fires if canvas becomes blank
        setTimeout(() => signatureRef.current?.readSignature(), 100);
    };

    const selectColor = (color) => {
        setPenColor(color);
        setIsEraser(false);
        signatureRef.current?.changePenColor(color);
        signatureRef.current?.changePenSize(brushSize, brushSize);
    };

    const selectBrushSize = (size) => {
        setBrushSize(size);
        const actualSize = isEraser ? size * 3 : size;
        signatureRef.current?.changePenSize(actualSize, actualSize);
    };

    const toggleEraser = () => {
        if (isEraser) {
            setIsEraser(false);
            signatureRef.current?.changePenColor(penColor);
            signatureRef.current?.changePenSize(brushSize, brushSize);
        } else {
            setIsEraser(true);
            signatureRef.current?.changePenColor("#FFFFFF");
            signatureRef.current?.changePenSize(brushSize * 3, brushSize * 3);
        }
    };

    const webStyle = `.m-signature-pad { box-shadow: none; border: none; }
        .m-signature-pad--body { border: none; }
        .m-signature-pad--footer { display: none; margin: 0; }
        body, html { margin: 0; padding: 0; }
        canvas { width: 100% !important; height: 100% !important; }`;

    return (
        <View>
            {/* Toolbar */}
            <View className="flex-row items-center flex-wrap gap-1 p-2 bg-dark-50 rounded-t-xl border border-dark-200">
                {/* Tool selection */}
                <View className="flex-row items-center gap-1 pr-2 border-r border-dark-300">
                    <TouchableOpacity
                        className={`p-1.5 rounded-lg ${!isEraser ? "bg-primary-100" : ""}`}
                        onPress={() => selectColor(penColor)}
                    >
                        <Text className={`text-xs font-lexend-bold ${!isEraser ? "text-primary-600" : "text-dark-400"}`}>
                            Pen
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`p-1.5 rounded-lg ${isEraser ? "bg-primary-100" : ""}`}
                        onPress={toggleEraser}
                    >
                        <Text className={`text-xs font-lexend-bold ${isEraser ? "text-primary-600" : "text-dark-400"}`}>
                            Eraser
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Colors */}
                <View className="flex-row items-center gap-1 pr-2 border-r border-dark-300">
                    {COLORS.map((c) => (
                        <TouchableOpacity
                            key={c.value}
                            onPress={() => selectColor(c.value)}
                            style={[
                                styles.colorDot,
                                { backgroundColor: c.value },
                                penColor === c.value && !isEraser && styles.colorDotActive,
                            ]}
                        />
                    ))}
                </View>

                {/* Brush size */}
                <View className="flex-row items-center gap-1 pr-2 border-r border-dark-300">
                    {BRUSH_SIZES.map((s) => (
                        <TouchableOpacity
                            key={s.value}
                            className={`px-2 py-1 rounded ${brushSize === s.value ? "bg-primary-100" : ""}`}
                            onPress={() => selectBrushSize(s.value)}
                        >
                            <Text className={`text-xs font-lexend-bold ${brushSize === s.value ? "text-primary-600" : "text-dark-400"}`}>
                                {s.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Actions */}
                <View className="flex-row items-center gap-1 ml-auto">
                    <TouchableOpacity className="p-1.5" onPress={handleUndo}>
                        <Text className="text-dark-500 text-sm">Undo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="p-1.5" onPress={handleClear}>
                        <Text className="text-red-500 text-sm">Clear</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Canvas */}
            <View
                className="border border-dark-200 border-t-0 rounded-b-xl overflow-hidden"
                style={{ height }}
            >
                <SignatureCanvas
                    ref={signatureRef}
                    onEnd={handleEnd}
                    onOK={handleOK}
                    onEmpty={handleEmpty}
                    webStyle={webStyle}
                    backgroundColor="#FFFFFF"
                    penColor={penColor}
                    minWidth={brushSize}
                    maxWidth={brushSize}
                    trimWhitespace={false}
                    imageType="image/png"
                    dataURL=""
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#d1d5db",
    },
    colorDotActive: {
        borderColor: "#6366f1",
        transform: [{ scale: 1.15 }],
    },
});
